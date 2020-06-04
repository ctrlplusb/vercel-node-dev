import execa from 'execa';
import path from 'path';
import axios from 'axios';
import waitForPort from 'wait-port';
import getPort from 'get-port';

const testTimeout = 10 * 1000;

let vercelNodeDevProcess: execa.ExecaChildProcess;
let vercelNodeDevPort: number;

let vercelDevProcess: execa.ExecaChildProcess;
let vercelDevPort: number;

const vercelPreviewURL = 'https://test-create-react-app.ctrlplusb.now.sh';

type Environment = 'vercel' | 'vercel dev' | 'vercel-node-dev';

const environments: Environment[] = process.env.CI
  ? ['vercel-node-dev']
  : [
      //'vercel', //
      // 'vercel dev', //
      'vercel-node-dev', //
    ];

const envURL = (environment: Environment, url: string) => {
  switch (environment) {
    case 'vercel':
      return `${vercelPreviewURL}${url}`;
    case 'vercel dev':
      return `http://localhost:${vercelDevPort}${url}`;
    case 'vercel-node-dev':
      return `http://localhost:${vercelNodeDevPort}${url}`;
  }
};

const spinUpVercelNodeDevOnTestProject = async () => {
  vercelNodeDevPort = await getPort();
  vercelNodeDevProcess = execa(
    path.join(process.cwd(), 'bin/vercel-node-dev'),
    ['-p', vercelNodeDevPort.toString()],
    {
      cwd: path.join(__dirname, 'fixtures/create-react-app'),
      env: {
        FORCE_COLOR: '1',
        VND_DEBUG: '1',
        // VND_SILENT_UI: '1',
      },
      stdio: 'inherit',
    },
  );
  await waitForPort({
    host: 'localhost',
    port: vercelNodeDevPort,
    output: 'silent',
  });
};

const spinUpVercelDevOnTestProject = async () => {
  vercelDevPort = await getPort();
  vercelDevProcess = execa(
    'vercel',
    ['dev', '--listen', `0.0.0.0:${vercelDevPort}`],
    {
      cwd: path.join(__dirname, 'fixtures/create-react-app'),
      env: {
        FORCE_COLOR: '1',
        PORT: vercelDevPort.toString(),
      },
      stdio: 'inherit',
    },
  );
  await waitForPort({
    host: 'localhost',
    port: vercelDevPort,
    output: 'silent',
  });
};

const deployTestProjectToVercel = async () => {
  await execa('vercel', [], {
    cwd: path.join(__dirname, 'fixtures/create-react-app'),
    env: process.env,
    stdio: 'inherit',
  });
};

beforeAll(async () => {
  await Promise.all([
    environments.includes('vercel')
      ? await deployTestProjectToVercel()
      : Promise.resolve(),
    environments.includes('vercel dev')
      ? await spinUpVercelDevOnTestProject()
      : Promise.resolve(),
    environments.includes('vercel-node-dev')
      ? await spinUpVercelNodeDevOnTestProject()
      : Promise.resolve(),
  ]);
}, 120 * 1000);

afterAll(() => {
  if (vercelNodeDevProcess) {
    vercelNodeDevProcess.kill('SIGTERM');
  }
  if (vercelDevProcess) {
    vercelDevProcess.kill('SIGTERM');
  }
});

environments.forEach((environment) => {
  describe('APIs', () => {
    test(
      `Specifying only the src falls through [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(envURL(environment, `/foo.html`));

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/This is the foo\.html page/);
      },
      testTimeout,
    );

    test(
      `Path segment as filename [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/articles/123456`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/articleId: 123456/);
      },
      testTimeout,
    );

    test(
      `Path segment as filename - with file extension [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/articles/123456.js`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/articleId: 123456/);
      },
      testTimeout,
    );

    test(
      `Path segment as directory name [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/blog/this-is-the-blog-slug`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/blogSlug: this-is-the-blog-slug/);
      },
      testTimeout,
    );

    test(
      `Path segment as directory name with sub path [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/blog/this-is-the-blog-slug/edit`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/edit blogSlug: this-is-the-blog-slug/);
      },
      testTimeout,
    );

    test(
      `Multiple directory path segments [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(
            environment,
            `/api/blog/this-is-the-blog-slug/admin/this-is-the-action`,
          ),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(
          /blogSlug: this-is-the-blog-slug, blogAction: this-is-the-action/,
        );
      },
      testTimeout,
    );

    test(
      `Multiple directory path segments + filename path segment [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(
            environment,
            `/api/blog/this-is-the-blog-slug/admin/this-is-the-action/this-is-the-type`,
          ),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(
          /blogSlug: this-is-the-blog-slug, blogAction: this-is-the-action, blogType: this-is-the-type/,
        );
      },
      testTimeout,
    );

    test(
      `With file extension resolves [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/hello-world.js`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/Hello world/);
      },
      testTimeout,
    );

    test(
      `Adjacent "/" characters in request paths are treated as a single "/" [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api//blog//foo-bar///edit.js`),
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/edit blogSlug: foo-bar/);
      },
      testTimeout,
    );

    test(
      `GET /api [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(envURL(environment, `/api`));

        // ASSERT
        expect(result.data).toEqual('root');
      },
      testTimeout,
    );

    test(
      `POST /api/method [${environment}]`,
      async () => {
        // ACT
        const result = await axios.post(envURL(environment, `/api/method`));

        // ASSERT
        expect(result.data).toEqual('POST');
      },
      testTimeout,
    );

    test(
      `POST /api/body [${environment}]`,
      async () => {
        // ACT
        const result = await axios({
          method: 'post',
          url: envURL(environment, `/api/body`),
          data: {
            foo: 'bar',
            baz: 'bob',
          },
          responseType: 'json',
        });

        // ASSERT
        expect(result.data).toEqual({
          foo: 'bar',
          baz: 'bob',
        });
      },
      testTimeout,
    );

    test(
      `GET /api/ [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(envURL(environment, `/api/`));

        // ASSERT
        expect(result.data).toEqual('root');
      },
      testTimeout,
    );

    test(
      `GET /api/hello-world/ [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/api/hello-world/`),
        );

        // ASSERT
        expect(result.data).toEqual('Hello world');
      },
      testTimeout,
    );

    test(
      `Invalid file extension results in 404 [${environment}]`,
      async () => {
        // ARRANGE
        expect.assertions(1);

        try {
          // ACT
          await axios.get(envURL(environment, `/api/hello-world.ts`));
        } catch (err) {
          // ASSERT
          expect(err.response.status).toBe(404);
        }
      },
      testTimeout,
    );

    test(
      `POST /api/invalid-path [${environment}]`,
      async () => {
        expect.assertions(1);

        try {
          // ACT
          await axios.post(envURL(environment, `/api/invalid-path`));
        } catch (err) {
          // ASSERT
          expect(err.response.status).toBe(404);
        }
      },
      testTimeout,
    );

    test(
      `API root path is case sensitive [${environment}]`,
      async () => {
        try {
          // ACT
          await axios.get(envURL(environment, `/Api/hello-world.js`));
        } catch (err) {
          // ASSERT
          expect(err.response.status).toBe(404);
        }
      },
      testTimeout,
    );

    test(
      `API routes are case sensitive [${environment}]`,
      async () => {
        try {
          // ACT
          await axios.get(envURL(environment, `/api/HellO-WoRlD.js`));
        } catch (err) {
          // ASSERT
          expect(err.response.status).toBe(404);
        }
      },
      testTimeout,
    );

    test(`404 on existing path mismatch should fall back to UI for body result [${environment}]`, async () => {
      expect.assertions(2);

      try {
        // ACT
        await axios.get(envURL(environment, `/api/HELLO-WORLD`));
      } catch (err) {
        // ASSERT
        expect(err.response.status).toBe(404);
        expect(err.response.data).toMatch(
          environment === 'vercel-node-dev'
            ? /Cannot GET \/api\/HELLO-WORLD/
            : /Web site created using create-react-app/,
        );
      }
    });

    test(`404 on non-existing API path should fall back to UI for body result [${environment}]`, async () => {
      expect.assertions(2);

      try {
        // ACT
        await axios.get(envURL(environment, `/api/invalid-path`));
      } catch (err) {
        // ASSERT
        expect(err.response.status).toBe(404);
        expect(err.response.data).toMatch(
          environment === 'vercel-node-dev'
            ? /Cannot GET \/api\/invalid-path/
            : /Web site created using create-react-app/,
        );
      }
    });

    test('TypeScript function', async () => {
      // ACT
      const result = await axios.get(
        envURL(environment, `/api/typescript-world`),
      );

      // ASSERT
      expect(result.data).toEqual('Hello world');
    });
  });

  describe('Routes configuration', () => {
    test(
      `GET /simple-route-to-dest [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/simple-route-to-dest`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('Hello world');
      },
      testTimeout,
    );

    test(
      `GET /query-strings-stack [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/query-strings-stack?external=foo`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          external: 'foo',
          internal: 'bar',
        });
      },
      testTimeout,
    );

    test(
      `GET /query-strings-with-continue-stack [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(
            environment,
            `/query-strings-with-continue-stack?external=foo`,
          ),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          external: 'foo',
          internalContinued: 'true',
          internal: 'bar',
        });
      },
      testTimeout,
    );

    test(
      `GET /headers-with-numbered-groups/$1/$2 [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/headers-with-numbered-groups/one/two`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.headers).toMatchObject({
          'x-my-custom-header-01': 'foo-one-two',
          'x-my-custom-header-02': 'foo-one',
          'x-my-custom-header-03': 'foo-two',
        });
        expect(response.data).toEqual('Hello world');
      },
      testTimeout,
    );

    // 😝 This is a strange one. Vercel cloud doesn't support named groups, only
    //    numbered groups. We will of course have to match them!
    test(
      `GET /headers-with-named-groups-do-not-work/:first/:second [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/headers-with-named-groups-do-not-work/one/two`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.headers).toMatchObject({
          'x-my-custom-header-01': 'foo-:first-:second',
          'x-my-custom-header-02': 'foo-:first',
          'x-my-custom-header-03': 'foo-:second',
        });
        expect(response.data).toEqual('Hello world');
      },
      testTimeout,
    );

    [301, 302, 303, 307, 308].forEach((redirectStatusCode) => {
      test(
        `GET /redirect-${redirectStatusCode} [${environment}]`,
        async () => {
          // ARRANGE
          expect.assertions(2);

          // ACT
          try {
            await axios.get(
              envURL(environment, `/redirect-${redirectStatusCode}`),
              {
                maxRedirects: 0,
              },
            );
          } catch (err) {
            // ASSERT
            expect(err.response.status).toEqual(redirectStatusCode);
            expect(err.response.headers['location']).toEqual(
              'https://google.com',
            );
          }
        },
        testTimeout,
      );
    });

    test(
      `GET /redirect-with-group-in-location-header [${environment}]`,
      async () => {
        // ARRANGE
        expect.assertions(2);
        const groupMatch = 'foo-bar-baz';

        // ACT
        try {
          await axios.get(
            envURL(
              environment,
              `/redirect-with-group-in-location-header/${groupMatch}`,
            ),
            {
              maxRedirects: 0,
            },
          );
        } catch (err) {
          // ASSERT
          expect(err.response.status).toEqual(301);
          expect(err.response.headers['location']).toEqual(
            `/api/articles/${groupMatch}`,
          );
        }
      },
      testTimeout,
    );

    test(
      `GET /redirect-with-dest_the-dest-is-ignored [${environment}]`,
      async () => {
        // ARRANGE
        expect.assertions(3);

        // ACT
        try {
          await axios.get(
            envURL(environment, `/redirect-with-dest_the-dest-is-ignored`),
            {
              maxRedirects: 0,
            },
          );
        } catch (err) {
          // ASSERT
          expect(err.response.status).toEqual(301);
          expect(err.response.headers['location']).toEqual(
            `https://google.com`,
          );
          expect(err.response.body).toEqual(undefined);
        }
      },
      testTimeout,
    );

    test(
      `GET /numbered-groups/$1/$2 [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/numbered-groups/one/two`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          first: 'one',
          second: 'two',
        });
      },
      testTimeout,
    );

    test(
      `GET /named-groups/:first/:second [${environment}]`,
      async () => {
        // ACT
        const response = await axios.get(
          envURL(environment, `/numbered-groups/one/two`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          first: 'one',
          second: 'two',
        });
      },
      testTimeout,
    );

    test(
      `POST /restricted-to-post [${environment}]`,
      async () => {
        // ACT
        const response = await axios.post(
          envURL(environment, `/restricted-to-post`),
        );

        // ASSERT
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('POST');
      },
      testTimeout,
    );

    test(
      `GET /restricted-to-post [${environment}]`,
      async () => {
        // ACT
        const result = await axios.get(
          envURL(environment, `/restricted-to-post`),
          {
            headers: {
              // 😱 Gosh this was a pain to figure out, but apparently for the
              //    create-react-app development server to respond with the
              //    index.html file if no public/static paths are matched you need
              //    to attach this header.
              Accept: 'text/html',
            },
          },
        );

        // ASSERT
        expect(result.status).toBe(200);
        expect(result.data).toMatch(/Web site created using create-react-app/);
      },
      testTimeout,
    );
  });
});
