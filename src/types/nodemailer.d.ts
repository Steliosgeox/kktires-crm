// Minimal module shim for environments where devDependencies (like @types/nodemailer)
// are not installed during the build (common on some CI/serverless setups).
declare module 'nodemailer' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodemailer: any;
  export default nodemailer;
}

