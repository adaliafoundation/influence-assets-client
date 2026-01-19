# Influence Bridge Client

The L1/L2 bridge client for Influence.

## License
This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).
Commercial use is not permitted without a separate license from Unstoppable Games, Inc.

For the avoidance of doubt:
The licensor considers non-commercial use under this license to include deployments or uses that collect funds solely to recover the reasonable costs of operating, maintaining, or administering the software, provided that such use is not primarily intended for or directed toward commercial advantage or monetary compensation, and that no profit is distributed to operators, contributors, or participants.

## Test Environment
1. Initialize your .env file:
    ```
    echo "PORT=4000

    REACT_APP_API_URL=http://localhost:3001
    REACT_APP_IMAGES_URL=http://localhost:3001
    REACT_APP_ETH_CHAIN_ID=1337
    REACT_APP_STARKNET_PROVIDER=http://localhost:9000
    REACT_APP_CLOUDFRONT_IMAGE_URL=
    REACT_APP_INFURA_ID=


    REACT_APP_ETHEREUM_SWAY_GOVERNOR=
    REACT_APP_ETHEREUM_SWAY_TOKEN=
    REACT_APP_ETHEREUM_ASTEROID_BRIDGE=
    REACT_APP_ETHEREUM_CREWMATE_BRIDGE=
    REACT_APP_ETHEREUM_ARVAD_CREWMATE_SALE=
    REACT_APP_ETHEREUM_CREWMATE_FEATURES=

    REACT_APP_STARKNET_ASTEROID_TOKEN=
    REACT_APP_STARKNET_ASTEROID_BRIDGE=
    REACT_APP_STARKNET_CREWMATE_TOKEN=
    REACT_APP_STARKNET_CREWMATE_BRIDGE=
    " > .env
    ```
1. Adjust or fill in any missing .env variables as needed.
    > i.e. All `REACT_APP_ETHEREUM_*` values should have been output at the end of the `seedChain` script in the `contacts` project.

    > i.e. All `REACT_APP_STARKNET_*` values should be available as the `proxy` property in `cache/development_contracts.json` in the `starknet-contacts` project.
1. Run `npm start`.

---

### ArgentX (notes as of 4.5.0)
- You can deploy a new wallet within ArgentX.
- To mint 10 ETH in your new wallet, POST to `${REACT_APP_STARKNET_PROVIDER}/mint` with a JSON body like this: `{ "address": "...", "amount": 10000000000000000000 }`

### Braavos (notes as of 2.14.1)
- _Braavos does not work well with devnet._
- You can deploy a new wallet AND mint test tokens (DST) directly within Braavos extension.
- It will create an account on the correct network, but the baseUrl for the provider (and all subsequent transactions) is the goerli network instead of the devnet network :-/

---

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:4000](http://localhost:4000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.
