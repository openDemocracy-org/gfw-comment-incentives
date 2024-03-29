# CommentX Monetization Service

This project is openDemocracy's Grant for Web-funded project to bring novel incentives to commenting via web monetization of the [Coral Talk](https://github.com/coralproject/talk) open-source comments platform.

The live, production version is working at https://opendemocracy.net/newmoney

## Staging server

You can interact with the prototype by visiting:

https://comment-fake-site.comment.opendemocracy.net/articles/hello-github/

Where 'hello-github' is a URL slug for an imaginary article on openDemocracy. Changing the slug will generate a new article.

The article's author can highlight comments in Coral if their Coral user ID is included in the article page template as e.g. `<meta name="author_comment_id" content="89a0e9a2-32b1-468a-a101-7005b4cf62e3" />`. In production this is done through the CMS but can be mocked in this imaginary article by adding the Coral user id as a URL parameter to the above URL `?caid=89a0e9a2-32b1-468a-a101-7005b4cf62e3`. Coral user IDs can be found in the Coral admin dashboard.

## Communication from Coral Talk instance

### Moderation phase

Every comment posted to Coral is sent to [./server-service.js](./server-service.js) via a "Moderation phase" in the Coral Talk instance. This hits the `/handle-comment` endpoint.

The service reads these comments and looks for identifiers sent in the comment body that it is being passed an author's web monetization wallet address, or a comment to highlight on the page. Comments that are used to pass messages are moderated as `status: 'REJECTED'` meaning they aren't shown as comments.

## Client-side JavaScript

The project provides two client side scripts: one for the article page which produces an interactive widget that guides commenters and page authors through their user journeys; the second is for the Coral Talk comments iframe and it listens for postMessages from the client script, and sends them up to the server via the moderation phase detailed above.

These files live in [./assets]`(./assets`) and are served by Express using Nunjucks templating.

## Running locally

Following the steps below will ensure you get your local version up and running as quickly as possible. 

### Supporting software: download and update / install

Firstly, and if you haven't already, install [Docker Desktop](https://www.docker.com/products/docker-desktop) for your OS. If you have Docker, make sure it's up-to-date. Install NodeJS if you haven't already.

### Coral Talk Step 1: clone and install dependencies

Secondly, clone openDemocracy's forked Coral Talk:

`$ git clone git@github.com:openDemocracy-org/talk.git`

We need a Coral Talk instance for the service to interact with. openDemocracy's [forked version](https://github.com/openDemocracy-org/talk) requests a JS file from this service [./assets/comment-x-iframe.js](./assets/comment-x-iframe.js), allowing us to run custom JS within the Coral Talk iframe. That's the only difference.

On the `main` branch of your cloned `talk`, run `$ npm install`

### Coral Talk Step 2: download docker database images

We are following the instructions for running Coral Talk from source on [Coral's setup page](https://docs.coralproject.net/coral/#source):

Setup Mongo and Redis using Docker:

```
$ docker run -d -p 27017:27017 --restart always --name mongo mongo:4.2
$ docker run -d -p 6379:6379 --restart always --name redis redis:3.2
```

### Incentives Service: clone, install dependencies and run

Clone this project and `npm install`. Copy `.env.default` to `.env`. 

Run `npm run watch:fake-site` to start the fake site.

You should now be able to access the development oD website at [http://localhost:2000/articles/hello-world](http://localhost:2000/articles/hello-world]).

In a new terminal window, run `npm run watch:service`

### Coral Talk Step 3: run and install a local Coral Talk instance

Our forked Coral Talk requests a JS file from this service. We need it to load our local version for local development. Open `src/core/server/app/views/templates/base.html` and comment out the staging URL and add the local URL:

`<script src="https://localhost:4000/assets/iframe.js"></script>`

Coral's setup docs say you can just start the service now, but we've only had success running the build command first:

`$ npm run build:development`

Once this has completed you can run

`$ npm run start:development`

You should now be able to access the Coral Talk install page at [http://localhost:3000/install](http://localhost:3000/install). 

### Connecting them up

Follow the Coral Talk installation steps. The only value that matters is the Site Permitted Domains. This needs to be set to the URL of our fake site above: http://localhost:2000

Once install is complete, you should be able to see the Coral comments panel at the bottom of an article page: [http://localhost:2000/articles/hello-world](http://localhost:2000/articles/hello-world])

(If this hasn't worked, check the ports are 4000 for the Incentives Service and 3000 for Coral Talk. Make sure you have copied .env.default to .env in the code for this project.)

Within your Coral Talk instance you need to create an External Moderation phase, an endpoint where all the comments get sent to. Our handler in [./server.js](./server.js) is listening on `/handle-comment` so the URL should be http://localhost:4000/handle-comment. 


## Incentives configuration

This project was designed to explore how sharing micropayments in different proportions creates different incentives for users. The code that sets these proportions for article authors, comment authors and the publisher (i.e. the incentive levers) can be found in `./comment-x-client.js` inside `function startRevShare()`.

### Uphold API

We are using the [Client Credentials Flow](https://uphold.com/en/developer/api/documentation/#client-credentials-flow)

Run the below manually to generate an access token, and then add this access token to .env as UPHOLD_ACCESS_TOKEN.

`curl https://api-sandbox.uphold.com/oauth2/token -X POST -H "Content-Type: application/x-www-form-urlencoded" -u 'clientID:clientSecret' -d 'grant_type=client_credentials'`

## Updating, building and deploying Coral Talk

### Updating

Clone [our forked version of Coral Talk](https://github.com/openDemocracy-org/talk).

Use branch `main` for `production` and `od-staging-main` for `staging`.

Ensure the URL inside the script tag in `src/core/server/app/views/templates/base.html` is `https://comment-x.comment.opendemocracy.net/assets/iframe.js` for production or `https://comment-x-service.staging-caprover.opendemocracy.net/assets/iframe.js` for staging.

Commit your changes.

Add the Coral Talk parent repository as a git remote:

`$ git remote add coral-origin git@github.com:coralproject/talk.git`

Fetch all branches: `$ git fetch --all`

Merge in the latest changes from their production branch:

`$ git merge coral-origin/main`

Push these changes up to our repo:

`$ git push origin [main / od-staging-main]`

### Building

Make sure Docker is running on your computer.

Ensure you are logged into the Docker CLI as a user who can access the Docker opendemocracy account and its [coral-talk repository](https://hub.docker.com/repository/docker/opendemocracy/coral-talk).

`$ docker login`

Build the image with the following command, using production or staging as the tag:

`$ docker build -t opendemocracy/coral-talk:[tag] .`

This can take some time...

Push the image up to Docker Hub:

`$ docker push opendemocracy/coral-talk:[tag]`

### Deploying

Go to CapRover server admin area. Go to the Coral Talk app (production or staging) and click through to Deployments. Scroll down to Method 6: Deploy via ImageName.

Paste the image name in e.g. `opendemocracy/coral-talk:production` and click Deploy Now.

After a moment or two the updated Coral Talk code will be deployed.
