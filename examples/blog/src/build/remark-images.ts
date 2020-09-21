import { createReadStream } from 'fs';
import { extname, resolve as resolvePath } from 'path';

import hasha from 'hasha';
import type { Site } from 'julienne';
import type { Root, Image } from 'mdast';
import sharp from 'sharp';
import type { Plugin } from 'unified';
import visit from 'unist-util-visit';

function getImagesFromTree(ast: Root) {
  let images: Image[] = [];

  visit(ast, 'image', (imageNode: Image) => {
    images.push(imageNode);
  });

  return images;
}

/**
 * Performs the following operations on images found in markdown files:
 *
 * 1. Generate a hashed URL based on the image file contents
 * 2. Resizes the image
 * 3. Copies the image to the `public/static/images` directory
 * 4. Replaces the original image path with its updated path in `public/static/images`.
 */
export const remarkImages: Plugin = ({
  site,
  contentDirectory,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  site: Site<any>;
  contentDirectory: string;
}) => {
  return transformer;

  async function transformer(ast: Root) {
    let images = getImagesFromTree(ast);

    await Promise.all(
      images.map(async (image) => {
        let imagePath = resolvePath(contentDirectory, image.url);
        let hash = await hasha.fromFile(imagePath);
        let extension = extname(imagePath);
        let publicFilename = `${hash}${extension}`;

        let publicPath = `/static/images/${publicFilename}`;

        image.url = publicPath;

        site.createResource(publicPath, () => {
          let transformer = sharp().resize(300);
          return createReadStream(imagePath).pipe(transformer);
        });
      }),
    );
  }
};
