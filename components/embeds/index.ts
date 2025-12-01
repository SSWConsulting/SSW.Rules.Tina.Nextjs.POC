import { Template } from "tinacms";
import { boxEmbedComponent, boxEmbedTemplate } from "./boxEmbed";
import { emailEmbedComponent, emailEmbedTemplate } from "./emailEmbed";
import { introEmbedComponent, introEmbedTemplate } from "./IntroEmbed";
import { imageEmbedComponent, imageEmbedTemplate } from "./imageEmbed";
import { youtubeEmbedComponent, youtubeEmbedTemplate } from "./youtubeEmbed";

export const embedComponents = {
  ...emailEmbedComponent,
  ...imageEmbedComponent,
  ...boxEmbedComponent,
  ...youtubeEmbedComponent,
  ...introEmbedComponent,
};

export const embedTemplates: Template[] = [
  emailEmbedTemplate,
  imageEmbedTemplate,
  boxEmbedTemplate,
  youtubeEmbedTemplate,
  introEmbedTemplate,
];
