"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { client } from "@/tina/__generated__/client";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

interface CarouselSlide {
  title: string;
  image: string;
  link: string;
}

export default function Carousel() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await client.queries.carousel({
          relativePath: "carousel.json",
        });
        if (!res.data.carousel.slides) return [];

        const slides: CarouselSlide[] = res.data.carousel.slides
          .filter((s): s is NonNullable<typeof s> => !!s)
          .map((s) => ({
            title: s.title ?? "",
            image: s.image ?? "",
            link: s.link ?? "#",
          }));
        setSlides(slides as CarouselSlide[]);
      } catch (err) {
        console.error("Failed to fetch carousel slides:", err);
      }
    };

    fetchSlides();
  }, []);

  const [sliderRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      slides: { perView: 'auto', spacing: 16 },
    },
    [
      (slider) => {
        let timeout: ReturnType<typeof setTimeout>;
        let mouseOver = false;

        function clearNextTimeout() {
          clearTimeout(timeout);
        }
        function nextTimeout() {
          clearTimeout(timeout);
          if (mouseOver) return;
          timeout = setTimeout(() => {
            slider.next();
          }, 5000);
        }

        slider.on("created", () => {
          slider.container.addEventListener("mouseover", () => {
            mouseOver = true;
            clearNextTimeout();
          });
          slider.container.addEventListener("mouseout", () => {
            mouseOver = false;
            nextTimeout();
          });
          nextTimeout();
        });
        slider.on("dragStarted", clearNextTimeout);
        slider.on("animationEnded", nextTimeout);
        slider.on("updated", nextTimeout);
      },
    ]
  );

  if (!slides.length) return null;

  return (
    <div>
      <div ref={sliderRef} className="keen-slider">
        {slides.map((slide, index) => (
          <div key={index} className="keen-slider__slide relative w-3xs h-32">
              <a href={slide.link} className="block w-full h-full relative">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-sm"
                />
                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/80 to-transparent rounded-b-sm" />
                <h3 className="absolute bottom-2 left-2 text-white text-lg md:text-xl bg-opacity-50 m-0 rounded">
                  {slide.title}
                </h3>
              </a>
            </div>
        ))}
      </div>
    </div>
  );
}
