import { AbstractFileProviderService } from "@medusajs/framework/utils"
import { FileTypes } from "@medusajs/types"
import { v2 as cloudinary } from "cloudinary"
import * as streamifier from "streamifier"

type CloudinaryOptions = {
    cloud_name: string
    api_key: string
    api_secret: string
}

export class CloudinaryFileProviderService extends AbstractFileProviderService {
    static identifier = "cloudinary"

    constructor({ }, options: CloudinaryOptions) {
        super()

        cloudinary.config({
            cloud_name: options.cloud_name,
            api_key: options.api_key,
            api_secret: options.api_secret,
        })
    }

    async upload(file: FileTypes.ProviderUploadFileDTO): Promise<FileTypes.ProviderFileResultDTO> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "medusa" },
                (error, result) => {
                    if (error || !result) {
                        reject(error)
                    } else {
                        resolve({
                            url: result.secure_url,
                            key: result.public_id,
                        })
                    }
                }
            )

            if (Buffer.isBuffer(file.content)) {
                streamifier.createReadStream(file.content).pipe(uploadStream)
            } else if (typeof file.content === "string") {
                streamifier.createReadStream(Buffer.from(file.content, "base64")).pipe(uploadStream)
            } else {
                // Fallback for streams/ReadStreams if supported by the runtime
                const stream = file.content as any
                stream.pipe(uploadStream)
            }
        })
    }

    async delete(file: FileTypes.ProviderDeleteFileDTO): Promise<void> {
        await cloudinary.uploader.destroy(file.file_key as string)
    }

    async getPresignedDownloadUrl(file: FileTypes.ProviderGetFileDTO): Promise<string> {
        const result = await cloudinary.api.resource(file.file_key as string)
        return result.secure_url
    }
}
