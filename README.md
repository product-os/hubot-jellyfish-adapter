# hubot-jellyfish

A Jellyfish adapter for [Hubot](https://hubot.github.com/)

## Developing

### Getting private package access

In order to develop hubot-jellyfish, you must have an [npmjs](https://npmjs.com) account
that has read access to the private Jellyfish packages. Provide your npmjs account
information with ops and request access. Once access has been granted, you will now
be able to build and run Jellyfish by setting the `NPM_TOKEN` environment variable:

```sh
npm login
export NPM_TOKEN=`cat ~/.npmrc | cut -d '=' -f 2`
```

### Setup
1. Clone this repo and install the npm dependencies:
    ```
    git clone git@github.com:product-os/hubot-jellyfish.git
    cd hubot-jellyfish && npm i
    ```

1. Create a local hubot instance:
    ```
    npm i -g yo generator-hubot
    mkdir myhubot && cd myhubot
    yo hubot
    ```
    Follow the instructions. When prompted to specify an adapter, enter `jellyfish`.

1. Use `npm link` to link the `hubot-jellyfish` adapter to the hubot instance:
    ```
    cd myhubot
    npm link ../hubot-jellyfish
    ```

1. Edit the `package.json` file in `myhubot` to add the `hubot-jellyfish` npm package
    as a dependency (set the version to the current version of this package):
    ```
    "dependencies": {
        ...
        "hubot-jellyfish": "^0.0.1"
    }
    ```

1. Configure environment variables

    The following environment variables must be defined before running hubot locally:
    
    * `HUBOT_JELLYFISH_API_URL` (e.g. `http://localhost:8000` for local development)
    * `HUBOT_JELLYFISH_LOGIN_USER`
    * `HUBOT_JELLYFISH_LOGIN_PASSWORD`
    
    The easiest way to do this is to add a `.env` to your `myhubot` folder and specify the environment variables in that file.

1. Use `npm link` to link to the `hubot` package in the `myhubot` project (otherise the local `node_modules/hubot` package is used and the adapter doesn't communicate with the same hubot as `myhubot` is using!)
    ```
    cd hubot-jellyfish
    npm link ../myhubot/node_modules/hubot
    ```

1. Run Hubot!
    ```
    cd myhubot
    bin/hubot -n hubot -a jellyfish
    ```
    
### Testing

To run the unit tests you have to unlink hubot from hubot-jellyfish:
```
cd hubot-jellyfish
npm unlink ../myhubot/node_modules/hubot
npm install
```
Then you can run the tests:
```
npm run test
```