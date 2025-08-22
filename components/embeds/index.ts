import { Template } from "tinacms";
import { emailEmbedComponent,  emailEmbedTemplate } from "./emailEmbed";
import { figureEmbedComponent,  figureEmbedTemplate } from "./figureEmbed";
import { imageEmbedComponent,  imageEmbedTemplate } from "./imageEmbed";
import { asideEmbedComponent, asideEmbedTemplate } from "./asideEmbed";
import { youtubeEmbedComponents, youtubeEmbedTemplate } from "./youtubeEmbed";
import { introEmbedComponent, introEmbedTemplate } from "./IntroEmbed";


export const embedComponents={
    ...emailEmbedComponent,
    ...imageEmbedComponent,
    ...figureEmbedComponent,
    ...asideEmbedComponent,
    ...youtubeEmbedComponents,
    ...introEmbedComponent,
}

export const embedTemplates:Template[]=[
    emailEmbedTemplate,
    imageEmbedTemplate,
    figureEmbedTemplate,
    asideEmbedTemplate,
    youtubeEmbedTemplate,
    introEmbedTemplate
]