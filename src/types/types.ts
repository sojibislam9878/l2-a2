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