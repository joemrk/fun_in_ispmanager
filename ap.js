import request from 'request-promise'
import fs from 'fs'

let currentServer = {}


//tail -f /usr/local/mgr5/var/XXXmgr.log | grep Request

const paramsSeparator = '%2C%20'; //  ", " если нужно удалить несколько ип '111.111.111.111%2C%20222.222.222.222'
// Исключив необязательные параметры из запроса ("sfrom", "clicked_button", "operafake", "progressid", параметры равные знаку * и параметры с пустыми значениями)


(async () => {

    // == delete sites ==
    try {
        const filterSites = await getSitesDataByFile()
        for (let s of filterSites) await delSitesFromServer(s)
        await genMessForDeleteSites(filterSites)

    } catch (error) {
        console.log('===');
        console.log(error);
    }


    // const domains = await parseSitesData()
    // await selectServer('185.253.47.114')
    // try {
    //   for (let d of domains) {
    //     const addIpRes = await addIp(d.ip)
    //     const addFtpUserRes = await addFtpUser(d.domain, d.domain)
    //     const addSiteRes = await addSite(d.domain, d.ip)
    //     const addSertRes = await addSert(d.domain)
    //     //
    //     if (addIpRes && addFtpUserRes && addSiteRes && addSertRes) console.log(`${d.domain}_Ok`);
    //     else console.log(`${d.domain}_Err`);
    //   }
    // } catch (error) {
    //   console.log('===');
    //   console.log(error);
    // }


})()

async function getSitesDataByFile() {
    const inputSites = await parseSitesData()

    let allSites = await getAllSites()
    const filterSites = []
    allSites.forEach(as => {
        let containsFlag = false;
        as.domains = as.domains.filter(d => {
            for (let is of inputSites) {
                if (d.domain === is) {
                    containsFlag = true
                    return d
                }
            }
        })
        if (containsFlag) filterSites.push(as)
    })
    return filterSites
}

async function genMessForDeleteSites(list) {
    const wf = []
    list.forEach(r => {
        for (let key in r) if (key !== 'domains') wf.push(`${key}: ${r[key]}`)
        const dda = r.domains.map(d => `\t${d.ip}`)
        wf.push('remove_ip:')
        wf.push(dda.join('\r\n'))
        wf.push('\r\n')
    })

    fs.writeFile('result.txt', wf.join('\r\n'), function (err) {
        if (err) return console.log(err);
        console.log('results has been write');
    })
}

async function getAllSites() {
    const servers = await getServers();
    const promises = []
    servers.servers.forEach(s => promises.push(getDomains(s)))
    const res = await Promise.all(promises)

    return res
}

async function selectServer(ip) {
    const servers = await getServers();

    const server = servers.servers.filter(s => {
        if (s.host === ip) return s
    })
    currentServer = server[0]
}

async function getServers() {
    const serversFileData = await fs.promises.readFile('servers.json');
    const servers = JSON.parse(serversFileData);
    return servers
}

async function delSitesFromServer(serverData) {
    // const includesDomains = await getIncludesDomains(domains)

    let ips = []
    let serverDomains = []
    serverData.domains.forEach(d => {
        if (d.ip !== '') {
            ips.push(d.ip)
            serverDomains.push(d.domain)
        }
    })
    const ipString = ips.join(paramsSeparator)
    const domainString = serverDomains.join(paramsSeparator)

    if (ipString.length > 1 && domainString.length > 1) {
        console.log(`delSites -> ${await delSite(domainString, serverData)}`);
        console.log(`delIps -> ${await deleteIp(ipString, serverData)}`);
    }
}

async function getIncludesDomains(domains) {
    const allServerSites = await getDomains()
    const includesDomains = []
    domains.filter(d => {
        let findFlag = false
        for (let s of allServerSites) {
            if (s.domain.includes(d)) {
                includesDomains.push(s)
                findFlag = true
            }
        }
        if (!findFlag) includesDomains.push({
            domain: d,
            ip: ''
        })
    })
    return includesDomains
}

async function addSert(domain) {
    const params2 = {
        sok: `ok`,
        domain_name: `${domain}`,
        crtname: `${domain}_le2`,
        username: `www-root`,
        domain: `${domain} www.${domain}`,
        name: `${domain}_le2`,
        email: `webmaster@${domain}`,
        enable_cert: `on`,
        keylen: `2048`,
    }

    const data = await ispRequest('letsencrypt.generate', buildFunctionParams(params2), 'get')
    return data.doc.messages.msg.msg_ok // ok
}

//example.com%2C%20example.com
async function delSite(domain, serverData) {
    const params = {
        elid: domain,
        remove_directory: 'on',
        confirm: 'on'
    }
    const data = await ispRequest('webdomain.delete', buildFunctionParams(params), 'get', serverData)
    return data.doc.ok // {}
}

async function addSite(domain, ip) {

    const params = {
        aliases: `www.${domain}`,
        autosubdomain: 'off',
        basedir: 'on',
        cancreatebox: '',
        cgi: 'off',
        charset: 'off',
        currname: domain,
        ddosshield: 'off',
        dirindex: 'index.php%20index.html',
        email: `webmaster%40${domain}`,
        emailcreate: 'off',
        expire_times: 'expire%5Ftimes%5Fs',
        foreground: 'on',
        gzip_level: '1',
        home: `www%2F${domain}`,
        hsts: 'off',
        ipaddrs: ip,
        ipsrc: 'manual',
        limit_cgi: 'on',
        limit_ssl: 'on',
        log_access: 'on',
        log_error: 'on',
        name: domain,
        owner: 'www%2Droot',
        php: 'on',
        php_apache_version: 'native',
        php_cgi_version: 'native',
        php_enable: 'on',
        php_mode: 'php%5Fmode%5Fmod',
        progressid: 'false',
        redirect_http: 'on',
        rotation_count: '10',
        rotation_period: 'every%5Fday',
        rotation_size: '100',
        script_selector: '%2A',
        secure: 'on',
        show_cache: 'on',
        show_params: 'yes',
        sok: 'ok',
        srv_cache: 'off',
        srv_gzip: 'off',
        ssi: 'on',
        // ssl_cert: 'selfsigned',
        ssl_cert: 'letsencrypt',
        // ssl_cert: `${domain}_le1`,
        ssl_port: '443',
    }

    const data = await ispRequest('webdomain.edit', buildFunctionParams(params), 'get')
    return data.doc.messages.msg.msg_ok // ok
}

async function deleteFtpUser(user) {
    const params = {
        elid: user,
        progressid: false,
        sok: 'ok'
    }
    const data = await ispRequest('ftp.user.delete', buildFunctionParams(params), 'get')
    return data.doc.ok // {}
}

// addFtpUser('example.com','example.com')
async function addFtpUser(user, password) {
    const params = {
        home: `%2Fwww%2F${user}`,
        name: user,
        owner: 'www%2Droot',
        passwd: password,
        progressid: false,
        sok: 'ok'
    }
    const data = await ispRequest('ftp.user.edit', buildFunctionParams(params), 'get')
    return data.doc.messages.msg.msg_ok // ok
}

//11.11.11.11%2C%2022.22.22.22
async function deleteIp(ips, serverData) {
    const params = {
        elid: ips,
        progressid: false,
        sok: 'ok'
    }
    const data = await ispRequest('ipaddrlist.delete', buildFunctionParams(params), 'get', serverData)
    return data.doc.ok // {}
}

async function addIp(ip) {
    const params = {
        name: ip,
        progressid: false,
        sok: 'ok'
    }
    const data = await ispRequest('ipaddrlist.edit', buildFunctionParams(params), 'get')
    return data.doc.messages.msg.msg_ok // ok
}

async function getIps() {
    const data = await ispRequest('ipdb', '', 'get')
    return data.doc.elem.map(address => {
        return address.range['$']
    })
}

async function getDomains(serverData = {}) {
    const data = await ispRequest('webdomain', '', 'get', serverData)
    const domainsList = data.doc.elem.map(d => {
        return {
            domain: d.name['$'],
            ip: d.ipaddr['$']
        }
    })

    if (serverData) {
        return {
            ...serverData,
            domains: domainsList
        }
    }
    return domainsList
}

async function ispRequest(func, params, method, serverData = currentServer) {
    if (currentServer) {
        const baseUrl = `https://${serverData.host}:1500/ispmgr?`;

        const requestData = await httpRequest(`${baseUrl}authinfo=${serverData.user}:${serverData.pass}&out=json&func=${func}${params}`, method)
        return requestData
    } else throw Error('=== pass not set! ===')
}

async function ispRequestSession(session, func, params, method) {
    const requestData = await httpRequest(`${baseUrl}auth=${session}&out=json&func=${func}${params}`, method)
    return requestData
}

function buildFunctionParams(params) {
    let paramString = ''
    for (let key in params) paramString += `&${key}=${params[key]}`
    return paramString
}

async function httpRequest(url, method = 'GET', body = null) {
    const options = {
        uri: url,
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        json: true,
        body,
        insecure: true,
        rejectUnauthorized: false
    }
    try {
        return await request(options)
    } catch (err) {
        console.log(err.message)
    }
}

async function parseSitesData() {
    const data = await fs.promises.readFile('./siteData.txt', {
        encoding: 'utf-8'
    })
    const lines = data.split('\r\n')
    const sitesData = []
    lines.forEach(l => {
        if (l.includes('|||')) {
            //example.com|||11.11.111.111
            const splitLine = l.split('|||')
            sitesData.push({
                domain: splitLine[0],
                ip: splitLine[1]
            })
        } else sitesData.push(l)
    })
    return sitesData
}