import express from 'express';
import ptp from 'pdf-to-printer';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';

const streamPipeline = promisify(pipeline);

const app = express();
const TMP_PATH = '.tmp/';
const port = 5275; // KARL

function log(message) {
    console.log(`[${(new Date()).toISOString()}] ${message}`);
}

async function downloadFile(remoteFilePath) {
    const tmpFilePath = path.join(`${TMP_PATH}${Math.random().toString(36)}.pdf`);

    log(`Start download of ${remoteFilePath} into ${tmpFilePath}`);
    const response = await fetch(remoteFilePath);

    if (!response.ok) {
        throw new Error(`unexpected response ${response.statusText} for file ${remoteFilePath}`);
    }
    await streamPipeline(response.body, fs.createWriteStream(tmpFilePath));
    log(`Download of ${remoteFilePath} completed`);
    return tmpFilePath;
}

async function printFile(tmpFilePath, options = {}) {
    log(`Trying to print ${tmpFilePath}`);
    await ptp.print(tmpFilePath, options);
    log(`Printed ${tmpFilePath}`);
}

async function processRequest(req, res) {
    const remoteFilePath = req.query.pdf;

    try {
        const localFilePath = await downloadFile(remoteFilePath);
        await printFile(localFilePath);
        fs.unlinkSync(localFilePath);
        log(`Deleted ${localFilePath}`);
        res.status(204).send();
    } catch (err) {
        log(`Error: ${err}`);
        res.status(404).send();
    }
}

app.get('', processRequest);
app.post('', processRequest);

if (!fs.existsSync(TMP_PATH)) {
    fs.mkdirSync(TMP_PATH);
}

app.listen(port, () => {
    log(`PDF Printing Server on port ${port}`)
});