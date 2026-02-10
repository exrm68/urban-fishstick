import React from 'react';
import { motion } from 'framer-motion';
import { Award, Star } from 'lucide-react';
import { Movie } from '../types';

interface Top10Props {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
}

const Top10: React.FC<Top10Props> = ({ movies, onMovieClick }) => {
  if (!movies || movies.length === 0) {
    return null;
  }

  // Sort by top10Position
  const sortedMovies = [...movies].sort((a, b) => 
    (a.top10Position || 999) - (b.top10Position || 999)
  ).slice(0, 10);

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 px-4">
        <Award className="text-gold" size={24} fill="currentColor" />
        <h2 className="text-2xl font-bold text-white">Top 10 Today</h2>
      </div>

      {/* Horizontal Scroll */}
      <div className="overflow-x-auto no-scrollbar px-4">
        <div className="flex gap-3 pb-4">
          {sortedMovies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMovieClick(movie)}
              className="relative flex-shrink-0 w-32 cursor-pointer group"
            >
              {/* Large Number */}
              <div className="absolute -left-2 -bottom-2 z-10 pointer-events-none">
                <div className="text-[120px] font-black leading-none text-transparent"
                     style={{
                       WebkitTextStroke: '3px rgba(255,255,255,0.15)',
                       textShadow: '0 0 20px rgba(0,0,0,0.8)'
                     }}>
                  {index + 1}
                </div>
              </div>

              {/* Movie Poster */}
              <div className="relative z-20 overflow-hidden rounded-lg shadow-2xl transition-transform group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-48 object-cover"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <h3 className="text-white text-xs font-bold line-clamp-2 mb-1">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={10} className="text-gold" fill="currentColor" />
                    <span className="text-white font-semibold">{movie.rating}</span>
                  </div>
                </div>
              </div>

              {/* Position Badge */}
              <div className="absolute top-2 right-2 z-30 bg-gold text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg">
                #{index + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Top10;
