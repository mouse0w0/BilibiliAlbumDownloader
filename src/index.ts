import https from 'https';
import fs from 'fs';

const uid = '1';
const downloadPath = 'download'; 

main();

async function main() {
    let images = await getAlbumImages(uid);
    console.log('Found images: ' + images.length);
    downloadImages(downloadPath, images);
    console.log('Download Finish!');
}

interface ImageInfo {
    folderName: string;
    fileName: string;
    md5: string;
    src: string;
}

async function getAlbumImages(uid: string): Promise<ImageInfo[]> {
    let list: ImageInfo[] = [];
    const pageSize = 0x7fffffff;
    const u = `https://api.vc.bilibili.com/link_draw/v1/doc/doc_list?uid=${uid}&page_num=0&page_size=${pageSize}&biz=all`
    const json: { data: { items: { description: string, pictures: { img_src: string }[] }[] } } =
        await getJson(u);
    for (let item of json.data.items) {
        for (let picture of item.pictures) {
            let img_src = picture.img_src;
            let imgFileName = img_src.substring(img_src.lastIndexOf('/') + 1);
            list.push({
                folderName: ensureFolderName(item.description),
                fileName: imgFileName,
                md5: imgFileName.substring(0, img_src.lastIndexOf('.')),
                src: img_src
            });
        }
    }
    return list;
}

async function downloadImages(path: string, images: ImageInfo[]) {
    mkdirSync(path);
    let count = 0;
    for (let image of images) {
        let folder = path + '/' + image.folderName;
        mkdirSync(folder);
        await download(folder + '/' + image.fileName, image.src);
        count++;
        console.log('Downloaded: ' + count + '/' + images.length);
    }
}

function getJson<T>(url: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        https.get(url, (res) => {
            let result = '';
            res.on('data', data => {
                result += data;
            });

            res.on('end', () => {
                resolve(JSON.parse(result));
            });

            res.on('error', reject);
        }).on('error', reject);
    });
}

function ensureFolderName(name: string): string {
    let replaced = name.replace(/\?/g, '？').replace(/\</g, '《').replace(/\>/g, '》').replace(/\:/g, '：')
        .replace(/\*/g, '_').replace(/\./g, '。').replace(/\|/g, '_').replace(new RegExp('\\n', 'g'), '')
        .replace(new RegExp('\/', 'g'), '_').replace(new RegExp('\\\\', 'g'), '_');
    return replaced.length <= 31 ? replaced : replaced.substring(0, 31);
}

function download(path: string, url: string) {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(path);
        https.get(url, function (res) {
            res.pipe(writeStream);
            res.on("error", (err) => reject(err));
            writeStream.on("finish", () => resolve());
        }).on("error", (err) => { reject(err) });
    })
}

function mkdirSync(dir: string) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
}