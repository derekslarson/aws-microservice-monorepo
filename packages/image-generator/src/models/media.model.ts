export interface MediaInterface {
  id: `${"GROUP"|"USER"}-${string}`;
  checksum:string;
  bannerbear_id: string;
  bannerbear_url?: string;
  createdAt: string;
  updatedAt: string;
}
