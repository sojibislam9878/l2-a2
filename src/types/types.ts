export interface IUser{
    name: string,
    email: string,
    password:string,
    role:string
}
export interface IResUser{
    id: number,
    name: string,
    email: string,
    role:string,
    created_at:string,
    updated_at:string
}

export type TCreateIssue = {
  title: string;
  description: string;
  type: string;
};
export type Tquery = {
  sort?: string;
  type?: string;
  status?: string;
};