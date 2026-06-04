import React from "react";
import StoryTemplateConfig from "../../components/StoryTemplateConfig";
import CarouselTemplateConfig from "../../components/CarouselTemplateConfig";

export function TemplatesTab({ messages }: { messages?: any[] }) {
  const validatedMessages = (messages || []).filter((m) => m.isValidatedForCarousel);

  return (
    <div className="h-full flex flex-col space-y-8 pb-12 overflow-y-auto pr-2 hide-scrollbar">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Design Studio</h2>
        <p className="text-slate-500 font-medium mt-1">Configure automated Instagram templates.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
         <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-bold text-lg text-slate-900">Story Template Core</h3>
            </div>
            <div className="p-6 pt-0">
               <StoryTemplateConfig />
            </div>
         </div>

         <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-bold text-lg text-slate-900">Carousel Engine</h3>
            </div>
            <div className="p-6 pt-0">
               <CarouselTemplateConfig 
                  validatedMessages={validatedMessages} 
                  onUnvalidateMessage={async (msgId) => {
                     console.log(`Unvalidate message ${msgId} in Mock mode`);
                  }}
               />
            </div>
         </div>
      </div>
    </div>
  );
}
