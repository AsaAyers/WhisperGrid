declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.module.css" {
  const value: Record<string, string>;
  export default value;
}
