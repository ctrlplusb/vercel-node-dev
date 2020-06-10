<h1 align="center">
  🧸
  <br/>
  vercel-node-dev
</h1>

<p align="center">
An unofficial development CLI for <a href="https://vercel.com/" target="_blank">Vercel</a> applications targeting the <a href="https://vercel.com/docs/runtimes#official-runtimes/node-js" target="_blank">Node.js runtime</a>.
</p>

<p align="center">
Fast reloads, improved reliability, offline and debugger support.
</p>

<p align='center'>
  <a href="http://npm.im/vercel-node-dev"><img alt="npm" src="https://img.shields.io/npm/v/vercel-node-dev.svg?style=flat-square" /></a>
  <a href="http://opensource.org/licenses/MIT"><img alt="MIT License" src="https://img.shields.io/npm/l/vercel-node-dev.svg?style=flat-square" /></a>
  <a href="https://travis-ci.org/ctrlplusb/vercel-node-dev"><img alt="Travis" src="https://img.shields.io/travis/ctrlplusb/vercel-node-dev.svg?style=flat-square" /></a>
</p>

<p>&nbsp;</p>

## Table of Contents

- [Features](#features)
- [Motivation](#motivation)
- [Vercel vs Us?](#vercel-vs-us)
- [Installation](#installation)
- [Usage](#usage)
- [Supported Features](#supported-features)
- [Supported Frameworks](#supported-frameworks)
- [Limitations](#limitations)
- [CLI Options](#cli-options)
- [Specifying a custom develop command](#specifying-a-custom-develop-command)
- [Debugging your Lambdas](#debugging-your-lambdas)
- [Bonus: Unit Testing your Lambdas](#bonus-unit-testing-your-lambdas)

<p>&nbsp;</p>

## Features

- Optimised for the [Node.js runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- Built against the [Vercel specifications](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- Supports Vercel ["Zero Config"](https://vercel.com/blog/zero-config) approach
- Supports both JavaScript or TypeScript lambdas
- Supports the attaching of a debugger session against lambda execution
- Supports Vercel custom [routes](https://vercel.com/docs/configuration#project/routes) configuration
- Fast reloading for any changes to your lambdas
- Extensively tested and verified via an integration test suite
- Can be run offline
- No need for a Vercel project to be configured prior to execution
- Does not need to be installed as a local dependency

<p>&nbsp;</p>

## Motivation

[Vercel](https://vercel.com/) provides its own development environment via the `vercel dev` command. Whilst this tool is powerful, I was experiencing the following issues:

- **Performance:** The feedback loop when making changes to my lambdas was very slow. After making a change, the subsequent request to the lamda would result in a significant wait for the lambda to be rebuilt and then served.
- **Reliability:** When making changes to my lambdas the build performance degraded over time, eventually resulting in them becoming unresponsive. The only way I was able to resolve this was to restart the `vercel dev` command, significantly impacting my development flow.
- **Debugging:** I was unable to attach a debugger instance against my lambdas. Whilst I try not to overuse the debugger, preferring to leverage integration tests, there are times when a debugger session can work wonders at issue discovery.
- **Usability:** There was a double hit for me here. Firstly, you need to have first set up / linked your project to a project configuration against Vercel. Secondly, and related to the first point, you need to be connected to the internet in order to use the tool.

The implementation of `vercel-node-dev` addresses these issues; focussing on the [Node.js runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js), which allowed me to create a much more bespoke and optimised development tool.

<p>&nbsp;</p>

## Vercel vs Us?

This tool is **_not_** meant to be **_competitive_**!

It is released with good intentions and respect for the Vercel team and community, offering a temporary alternative for those who may be experiencing similar issues with their development flow.

The `vercel dev` command is still in **beta**. My belief is that the Vercel team will eventually address the issues above, at which point this CLI will be deprecated. Given that we are following the official Vercel specifications, this would be a zero impact move for those using this CLI. You would only need to switch to executing the official `vercel dev` command instead of this one.

<p>&nbsp;</p>

## Installation

We recommend installing this library globally. This will allow you to quickly and easily use it against any of your Vercel applications, without polluting them with additional dependencies.

```bash
npm install -g vercel-node-dev
```

After the installation two CLI commands will be available to you, namely;

- `vercel-node-dev`
- `vnd` - a shorter aliased version

<p>&nbsp;</p>

## Usage

Simply navigate to the root of the [Vercel](https://vercel.com/) application and execute the CLI.

```bash
vercel-node-dev
```

Similar to the `vercel dev` command we will attempt to bind the development server against port `3000`.

Open your web browser and browse to `http://localhost:3000`.

<p>&nbsp;</p>

## Supported Features

Below is a list of the official Vercel features that we support.

I don't add any additional API features in comparison to the official APIs.

The design goal of this tool is to support as much of the official API as possible, whilst providing an improved development experience.

- The ["Zero Config"](https://vercel.com/blog/zero-config) approach promoted by Vercel.
- TypeScript (`.ts`) or JavaScript (`.js`) lambdas, within the `/api` directory, with filesystem based routing.
- The ability to [ignore files/directories](https://vercel.com/docs/v2/serverless-functions/introduction#prevent-endpoint-listing) within your `/api` directory from being bound as lambdas.
- [Path segments](https://vercel.com/docs/v2/serverless-functions/introduction#path-segments) for your lambdas.
- A [custom build step](https://vercel.com/docs/runtimes#advanced-usage/advanced-node-js-usage/custom-build-step-for-node-js), which will be executed prior to the execution of your lambdas.
- Automatic exposure of any environment variables defined within the `.env` file defined in the root of the project. This is inline with the [approach recommended by Vercel](https://vercel.com/docs/v2/build-step#environment-variables) for managing environment variables.
- Automated [extension of the HTTP Request and Response objects](https://vercel.com/docs/runtimes#official-runtimes/node-js/node-js-request-and-response-objects/node-js-helpers) that are passed into your lambdas.
- Custom [routes](https://vercel.com/docs/configuration#project/routes) configuration.

We follows the design, API, and features of the official [Node.js runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js) as closely as possible.

The [official docs](https://vercel.com/docs/runtimes#official-runtimes/node-js) and [advanced usage docs](https://vercel.com/docs/runtimes#advanced-usage/advanced-node-js-usage) should be used as your reference for understanding the above features in detail.

**Todo**

The following configuration options will be supported in the near future:

- [cleanUrls](https://vercel.com/docs/configuration#project/cleanurls)
- [trailingSlash](https://vercel.com/docs/configuration#project/trailingslash)

<p>&nbsp;</p>

## Supported Frameworks

I have tested the CLI against the following frameworks, utilising the ["Zero Config"](https://vercel.com/blog/zero-config) approach.

- [x] Create React App
- [x] Create React App + TypeScript
- [x] Gatsby
- [x] Vue.js
- [ ] Svelte
- [ ] Angular
- [ ] Ember.js
- [ ] Hugo
- [ ] Preact
- [ ] Docusaurus
- [ ] Gridsome
- [ ] Nuxt.js
- [ ] Eleventy
- [ ] Hexo

<p>&nbsp;</p>

## Limitations

Below is a list of the Vercel features that this CLI does not support. These limitations are intentional, and the likelihood is that I will not extend the CLI to support them.

- Support for any of the other runtimes - i.e. Go, Ruby, Python, or bespoke.

  > I feel like Node.js is where Vercel really shines, and IMO feel like they should have gone all in on Node.js rather than supporting an array of runtimes.

- Support for any of the following [`vercel.json` configuration](https://vercel.com/docs/configuration#introduction) options:

  - [headers](https://vercel.com/docs/configuration#project/headers)
  - [redirects](https://vercel.com/docs/configuration#project/redirects)
  - [rewrites](https://vercel.com/docs/configuration#project/rewrites)

  > Despair not! All of these configuration options can be represented via the [routes](https://vercel.com/docs/configuration#project/routes) configuration, which is supported.

- Support for the raw AWS lambda API, which is currently [supported by the official Node.js runtime](https://vercel.com/docs/runtimes#advanced-usage/advanced-node-js-usage/aws-lambda-api)

  > As stated in their docs, this has been exposed to help clients with existing lambdas migrate over to their platform. I'm not convinced this alternative CLI should support this.

- The bespoke [Vercel](https://vercel.com/) 4XX / 5XX error pages.

  > Meh. I return the expected error codes. I'd recommend you implement your own custom error pages in your UI anyways.

- Support for [disabling the Node.js helpers](https://vercel.com/docs/runtimes#advanced-usage/advanced-node-js-usage/disabling-helpers-for-node-js)

  > This has more of an impact on production environments, where you would want to hyper optimise lambda performance in some cases.

- Support for [Next.js](https://nextjs.org/) projects.

  > Next has it's own development server with bespoke features around the APIs and pages. I would recommend using the `next dev` command instead.

<p>&nbsp;</p>

## CLI Options

The CLI current supports the following options.

- `--debug-apis` | `-d`

  Setting this flag will enable the debugger against your lambdas.

- `--debug-apis-port [number]` | `-o [number]`

  Allows you to specify the port at which the debugger for your lambdas will run. By default it runs on port `9229`.

- `--port [number]` | `-p [number]`

  Allows you to specify the port at which the `vercel-node-dev` server will run. By default it will attempt to bind to port `3000`.

- `--root [string]` | `-r [string]`

  Allows you to specify the relative path at which your application code (APIs + UI) live. By default it will be `.`.

<p>&nbsp;</p>

## Specifying a custom develop command

If you aren't using one of the [supported frameworks](#supported-frameworks), or if you would like to customise the develop command, then you can add a `dev` script to your `package.json`:

```json
{
  "scripts": {
    "dev": "my-dev-tool -p $PORT"
  }
}
```

**Note:** It is important that you pass through the `$PORT` environment variable as shown in the example above. This is so that your development server can be correctly managed by `vercel-node-dev`.

<p>&nbsp;</p>

## Debugging your Lambdas

You can enabled the debugger for your lambdas by providing the respective option to the CLI:

```bash
vercel-node-dev --debug-apis
```

This will start the development server, with the debugger instance running. By default the debugger runs on port `9229`. You can change the port number via the `--debug-apis-port` option.

Once the debugger is running you can attach to it utilising your tool of choice.

### Debugging via VSCode

Below is a set of [`code` debug configurations](https://code.visualstudio.com/docs/editor/debugging), allowing you to either start the `vercel-dev-node` instance with the debugger attached, or to attach to an already executing debugger instance.

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    // This will start vercel-node-dev with the debugger attached
    {
      "name": "Launch vercel-node-dev",
      "type": "node",
      "request": "launch",
      "program": "vercel-node-dev",
      "args": ["--debug-apis"],
      "skipFiles": ["<node_internals>/**"],
      "autoAttachChildProcesses": true,
      "protocol": "inspector"
    },
    // First run `vercel-node-dev --debug-apis` and then execute this debug
    // configuration in order to attach to the running debugger.
    {
      "name": "Attach to process",
      "type": "node",
      "request": "attach"
    }
  ]
}
```

<p>&nbsp;</p>

## Bonus: Unit Testing your Lambdas

This tool leverages another library I built, [`vercel-node-server`](https://github.com/ctrlplusb/vercel-node-server), which allows you to create `http` instances of your lambdas. This opens up opportunities for you to write integration or unit tests for you lambdas.

Firstly, install the library as development dependency:

```bash
npm install -D vercel-node-server
```

You can then write tests for your lambdas similar to the one below:

```javascript
import { createServer } from 'vercel-node-server';
import listen from 'test-listen';
import axios from 'axios';
import helloLambda from './api/hello';

let server;
let url;

beforeAll(async () => {
  server = createServer(routeUnderTest);
  url = await listen(server);
});

afterAll(() => {
  server.close();
});

it('should return the expected response', async () => {
  const response = await axios.get(url, { params: { name: 'Pearl' } });
  expect(response.data).toBe('Hello Pearl');
});
```
