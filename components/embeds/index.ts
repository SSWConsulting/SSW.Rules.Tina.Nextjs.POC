import { Template } from "tinacms";
import { boxEmbedComponent, boxEmbedTemplate } from "./boxEmbed";
import { emailEmbedComponent, emailEmbedTemplate } from "./emailEmbed";
import { imageEmbedComponent, imageEmbedTemplate } from "./imageEmbed";
import { youtubeEmbedComponent, youtubeEmbedTemplate } from "./youtubeEmbed";
import { endOfIntroComponent, endOfIntroTemplate } from "./endOfIntro";

export const embedComponents = {
  ...endOfIntroComponent,
  ...emailEmbedComponent,
  ...imageEmbedComponent,
  ...boxEmbedComponent,
  ...youtubeEmbedComponent,
};

export const embedTemplates: Template[] = [
  endOfIntroTemplate,
  emailEmbedTemplate,
  imageEmbedTemplate,
  boxEmbedTemplate,
  youtubeEmbedTemplate,
];
