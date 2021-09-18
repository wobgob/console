import http from 'http'
import xml2js from 'xml2js'
import Sequelize from 'sequelize'
import initAuth from './models/auth/init-models.js'
import { makeRegistrationData } from './srp.js'
import config from './config.js'

const args = process.argv.slice(2)

if (args.length < 1) {
    console.log("Usage: node index.js '<command>'")
    process.exit(1)
}

const DB = new Sequelize(config.DATABASE)

try {
    await DB.authenticate()
    console.log('Connection has been established successfully.')
} catch (error) {
    console.error('Unable to connect to the database:', error)
}

const auth = initAuth(DB);

let soap = (command) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: config.HOST,
            port: config.PORT,
            method: "POST",
            auth: `${config.USERNAME}:${config.PASSWORD}`,
            headers: { 'Content-Type': 'application/xml' }
        }, res => {
            res.on('data', async d => {
                const xml = await xml2js.parseStringPromise(d.toString());

                const body = xml["SOAP-ENV:Envelope"]["SOAP-ENV:Body"][0];
                const fault = body["SOAP-ENV:Fault"];
                if (fault) {
                    resolve({
                        faultCode: fault[0]["faultcode"][0],
                        faultString: fault[0]["faultstring"][0],
                    });
                    return;
                }
                const response = body["ns1:executeCommandResponse"];
                if (response) {
                    resolve({
                        result: response[0]["result"][0]
                    });
                    return;
                }
                console.log(d.toString());
            })
        });
        req.write(
            '<SOAP-ENV:Envelope' +
            ' xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"' +
            ' xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"' +
            ' xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance"' +
            ' xmlns:xsd="http://www.w3.org/1999/XMLSchema"' +
            ' xmlns:ns1="urn:AC">' +
            '<SOAP-ENV:Body>' +
            '<ns1:executeCommand>' +
            '<command>' + command + '</command>' +
            '</ns1:executeCommand>' +
            '</SOAP-ENV:Body>' +
            '</SOAP-ENV:Envelope>'
        );
        req.end();
    });
}

(async () => {
    let account = await auth.account.findOne({ where: { username: config.USERNAME.toUpperCase() } })

    if (account === null) {
        let [salt, verifier] = makeRegistrationData(config.USERNAME.toUpperCase(), config.PASSWORD.toUpperCase())

        account = await auth.account.create({
            username: config.USERNAME.toUpperCase(),
            salt: salt,
            verifier: verifier
        })
    }

    let access = await auth.account_access.findOne({ where: { id: account.id } })

    if (access === null) {
        access = auth.account_access.build({
            id: account.id,
            RealmID: -1
        })
    }

    access.gmlevel = 4
    await access.save()

    let res = await soap(args[0])
    console.log(res)
    process.exit(0)
})()