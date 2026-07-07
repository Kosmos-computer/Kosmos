import { renderMediaOnLambda } from "@remotion/lambda/client"
import NextCors from 'nextjs-cors';

export default async function start(req, res) {
  await NextCors(req, res, {
    origin: '*',
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, x-api-key",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })

  if (req.method === 'POST') {
    try {
      const { renderId } = await renderMediaOnLambda({
        region: process.env.AWS_REGION,
        functionName: process.env.REMOTION_LAMBDA_FUNCTION,
        composition: process.env.REMOTION_COMPOSITION_NAME,
        serveUrl: process.env.REMOTION_SERVE_URL,
        codec: process.env.REMOTION_CODEC,
        inputProps: req.body
      })

      res.status(200).json({ renderId })
    } 
    catch (err) {
      res.status(500).json({ err })
    }
  }
  else {
    res.status(405)
  }
}
 
