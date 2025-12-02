import { Template } from "tinacms";
import { asideEmbedComponent, asideEmbedTemplate } from "./asideEmbed";
import { emailEmbedComponent, emailEmbedTemplate } from "./emailEmbed";
import { endOfIntroComponent, endOfIntroTemplate } from "./endOfIntro";
import { figureEmbedComponent, figureEmbedTemplate } from "./figureEmbed";
import { imageEmbedComponent, imageEmbedTemplate } from "./imageEmbed";
import { youtubeEmbedComponent, youtubeEmbedTemplate } from "./youtubeEmbed";
import { iconLinkComponent, iconLinkTemplate } from "./iconLink";

export const embedComponents = {
  ...endOfIntroComponent,
  ...emailEmbedComponent,
  ...imageEmbedComponent,
  ...figureEmbedComponent,
  ...asideEmbedComponent,
  ...youtubeEmbedComponent,
  ...iconLinkComponent,
};

export const embedTemplates: Template[] = [
  endOfIntroTemplate,
  emailEmbedTemplate,
  imageEmbedTemplate,
  figureEmbedTemplate,
  asideEmbedTemplate,
  youtubeEmbedTemplate,
  iconLinkTemplate,
];
