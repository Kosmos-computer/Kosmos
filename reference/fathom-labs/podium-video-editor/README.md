# Podium Video Editor

A Next.js app that uses Remotion to render podcast videos.

## Environments

The Podium video editor is deployed to the following environments:

- Development: [https://dev-video-editor.podium.page/demo.html](https://dev-video-editor.podium.page/demo.html)
- Production: [https://video-editor.podium.page/demo.html](https://video-editor.podium.page/demo.html)

## Example Render Command

To render a video locally, use the following command in conjuction with the `example_props.json` file. The video will be outputted to `out/render.mp4`.

```
npx remotion render PodcastVideo out/render.mp4 --props=./example_props.json
```

## Lambda

To render a video with AWS Lambda, use the following command in conjuction with the `example_props.json` file. The video will be outputted to `out/render.mp4`.

```
npx remotion lambda render https://remotionlambda-useast1-pl9hex6qhc.s3.us-east-1.amazonaws.com/sites/podcast-video-dev/index.html PodcastVideo out/render.mp4 --props=./example_props.json
```