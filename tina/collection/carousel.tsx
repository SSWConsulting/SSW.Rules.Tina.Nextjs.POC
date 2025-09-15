import type { Collection } from 'tinacms';

const Carousel: Collection = {
  label: 'Carousel',
  name: 'carousel',
  path: 'carousel',
  format: 'json',
  fields: [
    {
      type: 'object',
      label: 'Slides',
      name: 'slides',
      list: true,
      fields: [
        {
          type: 'string',
          label: 'Title',
          name: 'title',
        },
        {
          type: 'string',
          label: 'Image',
          name: 'image',
        },
        {
          type: 'string',
          label: 'Link',
          name: 'link',
        },
      ],
    }
  ]
};

export default Carousel;
