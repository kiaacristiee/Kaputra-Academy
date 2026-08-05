"use client";

import { motion } from "framer-motion";
import { UserRound, Users, Star } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img
                src="/icon.png"
                alt="Kaputra Academy Logo"
                className="h-28 w-auto object-contain"
              />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Kaputra Academy
            </h1>

            <div className="flex justify-center mt-6">
              <div className="w-40 h-[2px] bg-[#D4A24C]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-start">

            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-[#0A2A5E] mb-3">
                ABOUT US
              </h2>

              <div className="w-20 h-1 bg-[#D4A24C] mb-8" />

              <p className="text-slate-700 leading-8 mb-6">
                Kaputra Academy is a learning center dedicated to helping
                students achieve academic excellence through personalized
                learning experiences, structured programs, and expert guidance.
              </p>

              <p className="text-slate-700 leading-8 mb-10">
                We believe that every student learns differently. Through
                customized teaching methods and small class sizes, we help
                students build confidence, critical thinking skills, and a
                strong academic foundation.
              </p>

              {/* Founder */}
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-full bg-[#0A2A5E] flex items-center justify-center">
                  <UserRound
                    className="text-[#D4A24C]"
                    size={26}
                  />
                </div>

                <div>
                  <p className="text-[#D4A24C] font-semibold uppercase text-sm">
                    Founder
                  </p>

                  <h3 className="text-2xl font-bold text-[#0A2A5E]">
                    Andi Julio Kaputra
                  </h3>
                </div>
              </div>

              <div className="w-20 h-1 bg-[#D4A24C] mb-8" />

              <p className="text-slate-700 leading-8">
                Our programs are designed for students who want to strengthen
                their academic performance and excel in both school and
                international competitions.
              </p>

              <p className="text-slate-700 leading-8 mt-5">
                Through a combination of experienced mentors, effective
                learning systems, and personalized attention, Kaputra Academy
                aims to help every student reach their fullest potential.
              </p>
            </motion.div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex justify-center lg:justify-end"
            >
              <div className="w-full max-w-[550px] overflow-hidden rounded-3xl border-2 border-[#D4A24C] shadow-lg">
                <img
                  src="/about.png"
                  alt="Kaputra Academy"
                  className="w-full h-auto block"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Class System */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-[2px] bg-[#D4A24C] w-24" />

            <h2 className="text-3xl font-bold text-[#0A2A5E]">
              CLASS SYSTEM
            </h2>

            <div className="h-[2px] bg-[#D4A24C] w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">

            {/* Private */}
            <motion.div
              whileHover={{ y: -5 }}
              className="border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm"
            >
              <div className="grid grid-cols-[120px_1fr]">
                <div className="bg-[#0A2A5E] flex items-center justify-center">
                  <UserRound
                    className="text-[#D4A24C]"
                    size={60}
                  />
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-[#0A2A5E] mb-4">
                    PRIVATE CLASS
                  </h3>

                  <div className="w-16 h-1 bg-[#D4A24C] mb-5" />

                  <p className="text-slate-700 leading-7">
                    One-on-one learning sessions that provide focused
                    guidance, personalized feedback, and maximum learning
                    efficiency for each student.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Semi Private */}
            <motion.div
              whileHover={{ y: -5 }}
              className="border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm"
            >
              <div className="grid grid-cols-[120px_1fr]">
                <div className="bg-[#D4A24C] flex items-center justify-center">
                  <Users
                    className="text-[#0A2A5E]"
                    size={60}
                  />
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-[#0A2A5E] mb-2">
                    SEMI-PRIVATE CLASS
                  </h3>

                  <p className="font-semibold text-slate-500 mb-4">
                    3–4 Students
                  </p>

                  <div className="w-16 h-1 bg-[#D4A24C] mb-5" />

                  <p className="text-slate-700 leading-7">
                    Small group learning designed to encourage collaboration,
                    active participation, and personalized support from
                    instructors.
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Closing Banner */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="bg-[#0A2A5E] rounded-3xl px-8 py-10 flex flex-col md:flex-row items-center gap-6">

            <Star
              className="text-[#D4A24C] shrink-0"
              size={40}
            />

            <div>
              <h3 className="text-white text-2xl md:text-3xl font-bold">
                We don't just teach,
                <span className="text-[#D4A24C]">
                  {" "}we prepare champions.
                </span>
              </h3>

              <p className="text-slate-200 mt-3">
                Building strong foundations, developing confident learners,
                and shaping future leaders.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}