![](https://assets.hackclub.com/flag-orpheus-top.svg)

# Work Adventure Hack Club Fork


WorkAdventure is a platform that allows you to design **fully customizable collaborative virtual worlds** (metaverse). 
This is a Hack Club Fork of Work Adventure, used for Flavor Town (https://github.com/hackclub/flavortown)



## Useful tools for contributing to flavortown:

1. want to build out the map? try the **[map building documentation](https://docs.workadventu.re/map-building/)**
2. Many features are already developed by the WorkAdveture community: **[awesome-workadventure](https://github.com/workadventure/awesome-workadventure)**

## Setting up a production environment

there are 2 ways to set up a production environment:

- using Docker Compose
- or using a Helm chart for Kubernetes

Please check the [Setting up a production environment](docs/others/self-hosting/install.md) guide for more information.

We are using a helm chart for the production version of this codebase, but for local development this is overkill. Set out below are instructions for spinning up a local instance with docker compose.


## Setting up a development environment

> [!NOTE]
> These installation instructions are for local development only. They will not work on
> remote servers as local environments do not have HTTPS certificates.

Install Docker and clone this repository.

> [!WARNING]
> If you are using Windows, make sure the End-Of-Line character is not modified by the cloning process by setting
> the `core.autocrlf` setting to false: `git config --global core.autocrlf false`

Run:

```
cp .env.template .env

```

The environment will start with the OIDC mock server enabled by default.

You should now be able to browse to http://play.workadventure.localhost/ and see the application.
You can view the Traefik dashboard at http://traefik.workadventure.localhost

(Test user is "User1" and password is "pwd")

If you want to disable the OIDC mock server (for anonymous access), you can run:

```console
$ docker-compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up
```

Note: on some OSes, you will need to add this line to your `/etc/hosts` file:

**/etc/hosts**
```
127.0.0.1 oidc.workadventure.localhost redis.workadventure.localhost play.workadventure.localhost traefik.workadventure.localhost matrix.workadventure.localhost extra.workadventure.localhost icon.workadventure.localhost map-storage.workadventure.localhost uploader.workadventure.localhost maps.workadventure.localhost api.workadventure.localhost front.workadventure.localhost
```


### Troubleshooting

See our [troubleshooting guide](docs/others/troubleshooting.md). 

###### Go support Work Adventure:
[![Discord Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-Discord.png)](https://discord.com/invite/G6Xh9ZM9aR)
[![X Social Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-X.png)](https://twitter.com/Workadventure_)
[![LinkedIn Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-LinkedIn.png)](https://www.linkedin.com/company/workadventu-re/)
