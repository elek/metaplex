import log from 'loglevel';
import { create, globSource } from 'ipfs-http-client';
import path from 'path';
import { setImageUrlManifest } from './file-uri';

export interface ipfsCreds {
  projectId: string;
  secretKey: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ipfsUpload(
  ipfsCredentials: ipfsCreds,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
) {
  const tokenIfps = `${ipfsCredentials.projectId}:${ipfsCredentials.secretKey}`;
  const authIFPS = Buffer.from(tokenIfps).toString('base64');

  // @ts-ignore
  const ipfs = create({
    protocol: 'https',
    port: 443,
    host: 'www.storj-ipfs.com',
    headers: { Authorization: 'Basic ' + authIFPS },
  });

  const uploadToIpfs = async source => {
    const { cid } = await ipfs.add(source).catch();
    return cid;
  };

  async function uploadMedia(media) {
    const mediaHash = await uploadToIpfs(
      globSource(media, { recursive: true }),
    );
    log.debug('mediaHash:', mediaHash);
    const mediaUrl = `https://www.storj-ipfs.com/ipfs/${mediaHash}`;
    log.info('mediaUrl:', mediaUrl);
    log.info('uploaded media for file:', media);
    return mediaUrl;
  }

  const imageUrl = `${await uploadMedia(image)}?ext=${path
    .extname(image)
    .replace('.', '')}`;
  const animationUrl = animation
    ? `${await uploadMedia(animation)}?ext=${path
        .extname(animation)
        .replace('.', '')}`
    : undefined;

  const manifestJson = await setImageUrlManifest(
    manifestBuffer.toString('utf8'),
    imageUrl,
    animationUrl,
  );

  const manifestHash = await uploadToIpfs(
    Buffer.from(JSON.stringify(manifestJson)),
  );
  await sleep(500);
  const link = `https://www.storj-ipfs.com/ipfs/${manifestHash}`;
  log.info('uploaded manifest: ', link);

  return [link, imageUrl, animationUrl];
}
