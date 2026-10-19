import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { generatorDevSession } from '../scripts/lib/generator-dev-session.mjs';

it('defers only subscribed generator sockets, passes CSS/errors through, and restores on unsubscribe/close', () => {
  let subscribe: (data: {active:boolean}, client: any) => void;
  const ws = {on: vi.fn((_name, listener) => { subscribe = listener; }),send:vi.fn()};
  const server = {ws,httpServer:new EventEmitter()};
  (generatorDevSession().configureServer as any)(server);
  const makeClient = () => { const socket = Object.assign(new EventEmitter(),{send:vi.fn((_message: string) => {})});return {socket,send:vi.fn()}; };
  const generator = makeClient(), publicPage = makeClient();
  const original = generator.socket.send;
  subscribe!({active:true},generator);
  const reload = JSON.stringify({type:'full-reload',path:'*'});
  generator.socket.send(reload);publicPage.socket.send(reload);
  expect(JSON.parse(original.mock.calls.at(-1)![0])).toMatchObject({type:'custom',event:'witchclick:generator-update-deferred'});
  expect(publicPage.socket.send).toHaveBeenCalledWith(reload);
  for (const type of ['update','error','custom']) { const payload = JSON.stringify({type});generator.socket.send(payload);expect(original).toHaveBeenLastCalledWith(payload); }
  expect(ws.send).not.toHaveBeenCalled();
  subscribe!({active:false},generator);expect(generator.socket.send).toBe(original);
  subscribe!({active:true},generator);generator.socket.emit('close');expect(generator.socket.send).toBe(original);
});
