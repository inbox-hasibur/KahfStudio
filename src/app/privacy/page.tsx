import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | KahfNews",
  description: "Privacy Policy for KahfNews",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-32 pb-16 px-4 md:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-1.5 h-8 bg-red-600"></div>
        <h1 className="text-3xl md:text-4xl font-bold font-serif">গোপনীয়তা নীতি (Privacy Policy)</h1>
      </div>

      <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-8">
        <p className="text-muted-foreground leading-relaxed text-lg">
          আপনার গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। "খবর এআই" (KahfNews) পোর্টালে আপনার তথ্য
          কীভাবে সংগ্রহ ও ব্যবহার করা হয়, তা এই নীতিমালায় বর্ণনা করা হলো।
        </p>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">তথ্য সংগ্রহ</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            আমরা সাধারণত ব্যবহারকারীদের কোনো ব্যক্তিগত তথ্য সংগ্রহ করি না। তবে সাইটের মান
            উন্নয়নের জন্য এবং ট্রাফিক এনালাইসিসের জন্য কুকিজ (Cookies) এবং গুগল অ্যানালিটিক্স
            ব্যবহার করা হতে পারে।
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">বিজ্ঞাপন (Google AdSense)</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            আমাদের ওয়েবসাইটে গুগল অ্যাডসেন্স (Google AdSense) বা অন্যান্য তৃতীয় পক্ষের
            বিজ্ঞাপন দেখানো হতে পারে। গুগল তৃতীয় পক্ষের ভেন্ডর হিসেবে কুকিজ ব্যবহার করে বিজ্ঞাপন
            দেখাতে পারে। ব্যবহারকারীরা চাইলে গুগলের অ্যাড সেটিংসে গিয়ে পার্সোনালাইজড অ্যাড বন্ধ
            করতে পারেন।
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">বহিঃস্থ লিংক (External Links)</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            আমাদের খবরে অন্যান্য ওয়েবসাইটের লিংক (যেমন: বিবিসি বাংলা বা গুগল নিউজ) থাকতে
            পারে। ওই সাইটগুলোর নিজস্ব গোপনীয়তা নীতি রয়েছে, যার জন্য "খবর এআই" দায়ী নয়।
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">যোগাযোগ</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            এই গোপনীয়তা নীতি সম্পর্কে আপনার কোনো প্রশ্ন বা মতামত থাকলে আমাদের সাথে
            যোগাযোগ পেজের মাধ্যমে যোগাযোগ করুন।
          </p>
        </div>
      </div>
    </div>
  );
}
