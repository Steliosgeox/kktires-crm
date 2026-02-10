// Minimal module shim for environments where devDependencies (like @types/nodemailer)
// are not installed during the build (common on some CI/serverless setups).
//
// We intentionally keep this extremely loose: we only need TS to compile.
declare module 'nodemailer' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Transporter = any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createTransport(...args: any[]): Transporter;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodemailer: { createTransport: typeof createTransport };

  // Support `import nodemailer from "nodemailer"` with esModuleInterop.
  export = nodemailer;
}
