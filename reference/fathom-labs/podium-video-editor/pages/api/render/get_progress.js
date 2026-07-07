import { getRenderProgress } from "@remotion/lambda/client"
import NextCors from 'nextjs-cors';

export default async function get_progress(req, res) {
  await NextCors(req, res, {
    origin: '*',
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, x-api-key",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
  
  if (req.method === 'GET') {
    try {
      const progress = await getRenderProgress({
        renderId: req.query.renderId,
        bucketName: process.env.REMOTION_BUCKET_NAME,
        functionName: process.env.REMOTION_LAMBDA_FUNCTION,
        region: process.env.AWS_REGION,
      });

      res.status(200).json({ progress })
    } 
    catch (err) {
      res.status(500).json({ err })
    }
  }
  else {
    res.status(405)
  }
}
 
