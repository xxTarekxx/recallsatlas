"use client";

import { useState, useCallback } from "react";

interface RecallDetailImageSliderProps {
  imageUrls: string[];
  alt: string;
}

export default function RecallDetailImageSlider({ imageUrls, alt }: RecallDetailImageSliderProps) {
  const [index, setIndex] = useState(0);
  const len = imageUrls.length;
  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + len) % len);
    },
    [len]
  );

  if (len === 0) return null;
  if (len === 1) {
    return (
      <div className="recall-detail-media">
        <div className="recall-slider">
          <div className="recall-slider__track">
            <img
              src={imageUrls[0]}
              alt={alt}
              className="recall-slider__img"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recall-detail-media">
      <div className="recall-slider">
        <button
          type="button"
          className="recall-slider__arrow recall-slider__arrow--prev"
          onClick={() => go(-1)}
          aria-label="Previous image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="recall-slider__viewport">
          <div
            className="recall-slider__track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {imageUrls.map((src, i) => (
              <div key={i} className="recall-slider__slide">
                <img
                  src={src}
                  alt={`${alt} (${i + 1} of ${len})`}
                  className="recall-slider__img"
                />
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="recall-slider__arrow recall-slider__arrow--next"
          onClick={() => go(1)}
          aria-label="Next image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div className="recall-slider__dots" role="tablist" aria-label="Image index">
          {imageUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              className={`recall-slider__dot ${i === index ? "recall-slider__dot--active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
