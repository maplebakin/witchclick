export type CommentStatus = "pending" | "approved" | "rejected";

export interface StoredComment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  status: CommentStatus;
  moderatedAt?: string;
}

export interface CommentListOptions {
  includePending?: boolean;
  includeRejected?: boolean;
}

export interface NewCommentPayload {
  author?: string | null;
  message?: string | null;
}

export declare function listComments(
  slug: string,
  options?: CommentListOptions,
): Promise<StoredComment[]>;

export declare function addComment(
  slug: string,
  payload: NewCommentPayload | null | undefined,
): Promise<StoredComment>;

export declare function setCommentStatus(
  slug: string,
  commentId: string,
  status: CommentStatus,
): Promise<StoredComment | null>;

export declare function deleteComment(slug: string, commentId: string): Promise<boolean>;
