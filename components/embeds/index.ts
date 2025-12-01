import { Template } from "tinacms";
import { asideEmbedComponent, asideEmbedTemplate } from "./asideEmbed";
import { emailEmbedComponent, emailEmbedTemplate } from "./emailEmbed";
import { endOfIntroComponent, endOfIntroTemplate } from "./endOfIntro";
import { figureEmbedComponent, figureEmbedTemplate } from "./figureEmbed";
import { introEmbedComponent, introEmbedTemplate } from "./IntroEmbed";
import { imageEmbedComponent, imageEmbedTemplate } from "./imageEmbed";
import { youtubeEmbedComponent, youtubeEmbedTemplate } from "./youtubeEmbed";

export const embedComponents = {
  ...emailEmbedComponent,
  ...imageEmbedComponent,
  ...figureEmbedComponent,
  ...asideEmbedComponent,
  ...youtubeEmbedComponent,
  ...introEmbedComponent,
  ...endOfIntroComponent,
};

export const embedTemplates: Template[] = [
  emailEmbedTemplate,
  imageEmbedTemplate,
  figureEmbedTemplate,
  asideEmbedTemplate,
  youtubeEmbedTemplate,
  introEmbedTemplate,
  endOfIntroTemplate,
];
