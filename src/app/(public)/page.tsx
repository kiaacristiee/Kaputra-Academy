"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, Quote, Award, Users, Sparkles, ArrowRight, BookOpen, Clock3, FlaskConical, Trophy, ChevronLeft, ChevronRight, Medal } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { getContentBlocks } from "@/actions/cms";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [emblaApi]);

  // CMS state
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [aboutBlock, setAboutBlock] = useState<any>(null);
  const [contactBlock, setContactBlock] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    async function loadCmsData() {
      try {
        const res = await getContentBlocks();
        if (res.success && res.blocks) {
          const hero = res.blocks.find((b: any) => b.section === "hero_slider");
          if (hero) setHeroSlides(JSON.parse(hero.content));

          const about = res.blocks.find((b: any) => b.section === "about_us");
          if (about) setAboutBlock(JSON.parse(about.content));

          const contact = res.blocks.find((b: any) => b.section === "contact_info");
          if (contact) setContactBlock(JSON.parse(contact.content));
        }
      } catch (e) {
        console.error("Failed to load CMS homepage data:", e);
      }
    }
    loadCmsData();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  const currentSlide = heroSlides.length > 0 ? heroSlides[currentSlideIndex] : null;

  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center bg-white overflow-hidden border-b border-slate-100 pt-16 md:pt-0">
        <div className="absolute top-24 left-12 grid grid-cols-3 gap-3 opacity-20">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#F4B218]" />
          ))}
        </div>
        {/* Background Blur */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">

          {/* Floating Left Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="hidden xl:flex absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-[#F4B218]/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#F4B218]" />
            </div>

            <div className="text-left">
              <p className="font-semibold text-slate-900">
                Competition Focus
              </p>
              <p className="text-sm text-slate-500">
                International Preparation
              </p>
            </div>
          </motion.div>

          {/* Floating Right Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="hidden xl:flex absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0A2458]" />
            </div>

            <div className="text-left">
              <p className="font-semibold text-slate-900">
                Singapore Curriculum
              </p>
              <p className="text-sm text-slate-500">
                Grade 1 – Grade 9
              </p>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#F4B218]/10 text-[#0A2458] px-5 py-2 rounded-full text-sm font-semibold mb-8">
                <Sparkles className="w-4 h-4 text-[#F4B218]" />
                Singapore Curriculum Learning Center
              </div>

              {/* Heading */}
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
                {currentSlide ? currentSlide.title : (
                  <>
                    Empowering Students To Achieve
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A2458] to-[#F4B218]">
                      International Excellence
                    </span>
                  </>
                )}
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-slate-650 max-w-3xl mx-auto mb-10 leading-relaxed">
                {currentSlide ? currentSlide.subtitle : "Through the Singapore Curriculum, interactive learning experiences, and competition preparation programs, we help students develop confidence, critical thinking, and academic excellence."}
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href={currentSlide ? currentSlide.buttonLink : "/catalog"}>
                  <Button
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full bg-[#F4B218] hover:bg-[#d99c0d] text-slate-900 font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    {currentSlide ? currentSlide.buttonText : "Explore Programs"}
                  </Button>
                </Link>

                <Link href="/faq">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-lg rounded-full transition-transform hover:scale-105 active:scale-95"
                  >
                    FAQ
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-10 mt-14"
          >
            <div>
              <h3 className="text-3xl font-bold text-[#0A2458]">
                2020
              </h3>
              <p className="text-slate-500 text-sm">
                Established
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#0A2458]">
                G1 – G9
              </h3>
              <p className="text-slate-500 text-sm">
                Student Levels
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#0A2458]">
                75–90
              </h3>
              <p className="text-slate-500 text-sm">
                Minutes / Session
              </p>
            </div>
          </motion.div>
        </div>
      </section>
      {/* About Us Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Decorative Blur */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[30%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[25%] h-[40%] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            {/* Visual Column */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 relative"
            >
              {/* Decorative Accent box behind the image */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#F4B218]/20 to-blue-600/10 -rotate-2 scale-102" />

              {/* Image Container with Hover zoom */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-xl aspect-[4/5] bg-slate-50">
                <img
                  src="/about-photo.jpg"
                  alt="Students learning at Kaputra Academy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />

                {/* Overlay Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
              </div>



              {/* Grid Dots */}
              <div className="absolute -top-8 -left-8 grid grid-cols-4 gap-2 opacity-30 pointer-events-none">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F4B218]" />
                ))}
              </div>
            </motion.div>

            {/* Content Column */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 flex flex-col justify-center space-y-6"
            >
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-[#0A2458] bg-[#0A2458]/5 px-4 py-2 rounded-full inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F4B218]" />
                  About Kaputra Academy
                </span>
                <h2 className="mt-4 text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                  {aboutBlock?.title || "Nurturing Thinkers, Leaders, and Achievers"}
                </h2>
              </div>

              <p className="text-lg text-slate-650 leading-relaxed">
                {aboutBlock?.description || "Kaputra Academy is a learning center that focuses on helping students achieve academic excellence throught the Singapore Curriculum and international competition preparation."}
              </p>

              {/* Highlights List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#F4B218]/20 flex items-center justify-center text-[#d99c0d] shrink-0 mt-0.5">
                    <Award className="w-3.5 h-3.5 text-[#F4B218]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Our Vision</h4>
                    <p className="text-sm text-slate-500">
                      {aboutBlock?.vision || "To be the leading learning center for nurturing mathematical and scientific curiosity in children."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#F4B218]/20 flex items-center justify-center text-[#d99c0d] shrink-0 mt-0.5">
                    <Trophy className="w-3.5 h-3.5 text-[#F4B218]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Our Mission</h4>
                    <p className="text-sm text-slate-500">
                      {aboutBlock?.mission || "Empowering students through structured learning, premium mentoring, and fostering a growth mindset."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link href="/about">
                  <Button
                    size="lg"
                    className="group h-12 px-6 rounded-full bg-[#0A2458] hover:bg-[#081c44] text-white font-medium shadow-md transition-all inline-flex items-center gap-2"
                  >
                    Learn More About Us
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        {/* Background blobs for premium depth */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-[#F4B218]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="container mx-auto px-4">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#F4B218] bg-[#F4B218]/10 px-4 py-2 rounded-full">
                Excellence in Action
              </span>
              <h2 className="mt-4 text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
                Our Student Achievements
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Celebrating the outstanding accomplishments of our students in prestigious local and international competitions.
              </p>
            </div>
            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 self-start md:self-end">
              <button
                onClick={scrollPrev}
                className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm hover:shadow active:scale-95"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm hover:shadow active:scale-95"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Embla Carousel Viewport */}
          <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
            <div className="flex -ml-6">
              {/* Slide 1 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/Aldrin.PNG"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#F4B218]/10 flex items-center justify-center text-[#F4B218] group-hover:scale-110 transition-transform duration-300">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian School Math Olympiad Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Aldrin achieved an outstanding Silver award, competing in Singapore and Asian School Math Olympiad.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Aldrin Avery Adipratomo</p>
                        <p className="text-xs text-slate-500">Grade 1 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 2 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/david.PNG"
                        alt="David - SASMO Silver Medalist"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
                          <Award className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian School Math Olympiad Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 2nd place in the Singapore and Asian Schools Math Olympiad (SASMO), demonstrating top-tier logical reasoning.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 3 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/David (1).PNG"
                        alt="David Vincent Sugia - SASMO Gold Medalist"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-300">
                          <Star className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          World Mathematics Invitationals Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 1st place in World Mathematics Invitational (WMI) Final Round, winning a Gold Award for his outstanding math performance.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 4 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/Hugo 2.PNG"
                        alt="Hugo Levinson - SASMO Gold Medalist"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                          <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian School Math Olympiad (SASMO) Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 1st place in Singapore and Asian School Math Olympiad (SASMO)</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Hugo Levinson Susanto</p>
                        <p className="text-xs text-slate-500">Grade 4 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 5 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/matthew.PNG"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                          <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          World Mathematics Invitationals Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 1st place in World Mathematics Invitationals (WMI)</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Matthew Wayne Louis</p>
                        <p className="text-xs text-slate-500">Grade 3 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 6 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/Roy.PNG"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                          <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 2nd place in Singapore and Asian Schools Math Olympiad (SASMO)</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 7 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/roy 2.PNG"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                          <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Gold Medalist in Singapore Math Challenge
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the 1st place in Singapore Math Challenge with a perfect score.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 9 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/1.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Silver Medalist in International Junior Math Olympiad (IJMO)
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved a Silver Medal in International Junior Math (IJMO)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">IJMO 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 10 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/2.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Bronze Medalist in World Mathematics Invitationals (WMI)
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in World Mathematics Invitationals (WMI)                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Emma Jayde</p>
                        <p className="text-xs text-slate-500">WMI 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 11 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/3.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Southeast Asian Mathematical Olympiad (SEAMO X 2026) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Southeast Asian Mathematical Olympiad (SEAMO X 2026)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">SEAMO X 2026</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 12 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/4.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Junior International Science & Mathematics Olympiad (JISMO) Emerald Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Emerald Medal in Junior International Science & Mathematics Olympiad (JISMO - Math)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Hugo Levinson Susanto</p>
                        <p className="text-xs text-slate-500">JISMO 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 13 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/5.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          American Mathematics Olympiad Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in American Mathematics Olympiad (AMO)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Evan Jacob Kuncoro</p>
                        <p className="text-xs text-slate-500">AMO 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 14 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/6.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore Math Challenge (SMC) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Singapore Math Challenge (SMC)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Mayer Sugijanto</p>
                        <p className="text-xs text-slate-500">SMC 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 15 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/7.PNG"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          World Mathematics Invitationals (WMI) Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Silver Medal in World Mathematics Invitationals (WMI)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent</p>
                        <p className="text-xs text-slate-500">WMI 2025</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 16 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/8.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad (SASMO) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Singapore and Asian Schools Math Olympiad (SASMO)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Evan Jacob Kuncoro</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 17 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/9.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad (SASMO) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Singapore and Asian Schools Math Olympiad (SASMO)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Matthew Wayne Louis</p>
                        <p className="text-xs text-slate-500">Grade 3 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 18 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/10.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore Math Global Finals (SMGF) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Singapore Math Global Finals (SMGF)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Ray Rusli</p>
                        <p className="text-xs text-slate-500">Grade 8 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 19 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/11.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore Math Global FInals (SMGF) Bronze Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Bronze Medal in Singapore Math Global Finals (SMGF)                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent</p>
                        <p className="text-xs text-slate-500">Grade 8 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 20 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/12.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Southeast Asian Mathematical Olympiad (SEAMO X 2026) Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Silver Medal in Southeast Asian Mathematical Olympiad (SEAMO X 2026)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">SEAMO X 2026</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 21 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/13.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Math Olympiad (SASMO) Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Silver Medal in Singapore and Asian Math Olympiad (SASMO)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Aldrin Avery Adipratomo</p>
                        <p className="text-xs text-slate-500">Grade 1 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 22 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/14.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          World Mathematics Invitationals (WMI) Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Gold Medal in World Mathematics Invitationals (WMI)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">Grade 3 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 23 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/15.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad (SASMO) Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Silver Medal in Singapore and Asian Schools Math Olympiad (SASMO)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 24 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/16.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad (SASMO) Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Gold Medal in Singapore and Asian Schools Math Olympiad (SASMO)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">SEAMO X 2026</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 25 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/17.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Japan International Science & Mathematics Olympiad Ruby Award
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Ruby Award in Japan International Science & Mathematics Olympiad                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">David Vincent Sugia</p>
                        <p className="text-xs text-slate-500">SEAMO X 2026</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 26 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/18.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          World Mathematics Invitationals (WMI) Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Gold Medal in World Mathematics Invitationals (WMI)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Matthew Wayne Louis</p>
                        <p className="text-xs text-slate-500">Grade 3 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 27 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/19.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore and Asian Schools Math Olympiad (SASMO) Silver Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Silver Medal in Singapore and Asian Schools Math Olympiad (SASMO)                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Slide 28 */}
              <div className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-6">
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Local Image Container */}
                  <div className="p-6 pb-0">
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                      <Image
                        src="/20.png"
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                          Singapore Math Challenge (SMC) Gold Medalist
                        </h3>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        Achieved the Gold Medal in Singapore Math Challenge (SMC) Gold Medal                     </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Roy Alexander Rusli</p>
                        <p className="text-xs text-slate-500">Grade 7 Student</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-slate-50 border-t border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#F4B218] bg-[#F4B218]/10 px-4 py-2 rounded-full">
              Why Choose Kaputra Academy
            </span>

            <h2 className="mt-6 text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
              A Learning Experience Designed For Excellence
            </h2>

            <p className="mt-4 text-lg text-slate-600">
              We provide high-quality learning experiences through expert teachers,
              internationally recognized curriculum, and engaging classroom activities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

            {/* Card 1 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F4B218]/10 flex items-center justify-center mb-5">
                <Award className="w-8 h-8 text-[#F4B218]" />
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Expert & Experienced Teachers
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Taught by skilled and experienced teachers who understand how to
                guide students effectively.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F4B218]/10 flex items-center justify-center mb-5">
                <BookOpen className="w-8 h-8 text-[#F4B218]" />
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Singapore International Curriculum
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Using the Singapore Curriculum to strengthen students’ academic
                foundation and problem-solving skills.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F4B218]/10 flex items-center justify-center mb-5">
                <Clock3 className="w-8 h-8 text-[#F4B218]" />
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Effective Class Duration
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Learning sessions are designed for 75–90 minutes to maximize focus,
                engagement, and understanding.
              </p>
            </motion.div>

            {/* Card 4 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F4B218]/10 flex items-center justify-center mb-5">
                <FlaskConical className="w-8 h-8 text-[#F4B218]" />
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Interactive Activities
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Students enjoy experiments and engaging activities that make
                learning more exciting and memorable.
              </p>
            </motion.div>

            {/* Card 5 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F4B218]/10 flex items-center justify-center mb-5">
                <Trophy className="w-8 h-8 text-[#F4B218]" />
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Trusted By High-Achieving Students
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Kaputra Academy has guided many students to achieve excellent
                academic results and competition achievements.
              </p>
            </motion.div>

          </div>
        </div>
      </section>



      {/* Featured Courses Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
              Our Programs
            </h2>

            <p className="text-lg text-slate-600">
              Discover our Singapore Curriculum programs designed to strengthen
              academic foundations and prepare students for international
              competitions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">

            {/* Competition Class */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative bg-white rounded-3xl shadow-xl border-2 border-[#F4B218]/50 hover:border-[#F4B218] transition-all"
            >
              {/* Creative Floating Badge */}
              <div className="absolute -top-4 right-6 bg-gradient-to-r from-[#F4B218] to-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 border border-white/20 z-10 animate-pulse">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                Most Popular
              </div>

              <div className="bg-[#0A2458] text-white p-8 rounded-t-[22px] relative overflow-hidden">
                {/* Decorative background glow inside header */}
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute left-10 -bottom-10 w-32 h-32 rounded-full bg-[#F4B218]/10 blur-xl pointer-events-none" />

                <span className="text-sm font-semibold uppercase tracking-wider text-[#F4B218]">
                  Semi Private
                </span>

                <h3 className="text-3xl font-bold mt-2">
                  Competition Class
                </h3>

                <p className="mt-3 text-slate-200">
                  Designed for students preparing for international competitions and advanced academic challenges.
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Level</span>
                  <span className="font-semibold">Grade 1 - Grade 9</span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-semibold">75 - 90 Minutes</span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Fee</span>
                  <span className="font-semibold text-[#0A2458]">
                    Starting from Rp200.000
                  </span>
                </div>

                <ul className="space-y-2 text-sm text-slate-600 pt-2">
                  <li>✓ 1 Free Trial Session Included</li>
                  <li>✓ International Competition Preparation</li>
                  <li>✓ Singapore Curriculum</li>
                  <li>✓ Problem Solving Focus</li>
                  <li>✓ Small Group Learning</li>
                </ul>

                <Link href="/catalog">
                  <Button className="w-full mt-4 bg-[#0A2458] hover:bg-[#081c45] text-white">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Regular Class */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative bg-white rounded-3xl shadow-lg border border-slate-100 transition-all"
            >
              {/* Creative Floating Badge */}
              <div className="absolute -top-4 right-6 bg-gradient-to-r from-[#F4B218] to-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 border border-white/20 z-10">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                Free Trial Available
              </div>

              <div className="bg-[#F4B218] text-slate-900 p-8">
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Semi Private
                </span>

                <h3 className="text-3xl font-bold mt-2">
                  Regular Class
                </h3>

                <p className="mt-3">
                  Focused on strengthening academic foundations through the Singapore Curriculum.
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Level</span>
                  <span className="font-semibold">Grade 1 - Grade 9</span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-semibold">90 Minutes</span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-600">Fee</span>
                  <span className="font-semibold text-[#00000]">
                    Starting from Rp175.000
                  </span>
                </div>

                <ul className="space-y-2 text-sm text-slate-600 pt-2">
                  <li>✓ 1 Free Trial Session Included</li>
                  <li>✓ Singapore Curriculum</li>
                  <li>✓ Academic Foundation Building</li>
                  <li>✓ Interactive Learning Activities</li>
                  <li>✓ Small Group Learning</li>
                </ul>

                <Link href="/catalog">
                  <Button className="w-full mt-4 bg-[#F4B218] hover:bg-[#d99c0d] text-slate-900">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="flex justify-center mt-12">
            <Link href="/catalog">
              <Button
                size="lg"
                className="group h-13 px-8 rounded-full bg-white hover:bg-slate-50 text-[#0A2458] border border-slate-250 font-semibold shadow-md transition-all inline-flex items-center gap-2"
              >
                View All Programs
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
