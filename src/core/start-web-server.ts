import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

export function startWebServer() {
  app.get('/', (_: Request, res: Response) => {
    res.send('Hello, TypeScript with Express!');
  });

  app.listen(port, () => {
    console.log(`Server is running at <http://localhost>:${port}`);
  });
}