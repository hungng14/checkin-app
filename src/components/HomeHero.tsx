'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function HomeHero() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center'>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className='text-3xl font-semibold text-slate-800 dark:text-slate-100'
      >
        ✨ Ready to Rock This Day? ✨
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className='text-slate-600 dark:text-slate-400'
      >
        {" Today's"} your canvas! Check in and paint it with awesome moments 🎨
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className='flex gap-3'
      >
        {/* Sign In Button – Warm Sunset Gradient */}
        <Button
          asChild
          className='rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 
             hover:from-rose-600 hover:via-orange-500 hover:to-amber-500
             text-white font-semibold 
             px-6 py-2 
             shadow-lg hover:shadow-xl 
             transition-all duration-300 transform hover:scale-105'
        >
          <Link href='/auth/signin'>Sign In</Link>
        </Button>

        {/* Sign Up Button – Cool Ocean Gradient */}
        <Button
          asChild
          className='rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 
             hover:from-cyan-600 hover:via-sky-600 hover:to-blue-700
             text-white font-semibold 
             px-6 py-2 
             shadow-lg hover:shadow-xl 
             transition-all duration-300 transform hover:scale-105'
        >
          <Link href='/auth/signup'>Sign Up</Link>
        </Button>
      </motion.div>
    </main>
  );
}
