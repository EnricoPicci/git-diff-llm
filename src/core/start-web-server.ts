import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;

export function startWebServer() {
  app.get('/', (_: Request, res: Response) => {
    res.send(`git-diff-llm server started. Version: ${version}`);
  });

  app.listen(port, () => {
    console.log(`git-diff-llm server is running at <http://localhost>:${port} - Version: ${version}`);
  });
}