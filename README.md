# acore-console
Access the AzerothCore console locally to perform scheduled tasks

## Usage
1. Edit the world server configuration file to enable SOAP.

```conf
azerothcore-wotlk/env/dist/etc/worldserver.conf:
    # CONSOLE AND REMOTE ACCESS
    SOAP.Enabled = 1
    SOAP.Port = 7879
```

2. Restart the world server.
3. Create the `acore-console` configuration file.

```js
acore-console/config.js:
    export default
    {
        "USERNAME": "console",
        "PASSWORD": "<account-password>",
        "DATABASE": "mysql://acore:<mysql-pass>@localhost:3306/acore_auth",
        "HOST": "localhost",
        "PORT": 7878
    }
```

4. Run `npm install` or `npm ci` to get dependencies.
5. Run `node index.js 'server info` to test it works.
6. Setup a cron job for each console command you want to run by running `crontab -e`.

```
0 0 * * * /usr/bin/node /home/<user>/acore-console/index.js 'daily macaroons'
```

Would run the `daily macaroons` command at midnight.