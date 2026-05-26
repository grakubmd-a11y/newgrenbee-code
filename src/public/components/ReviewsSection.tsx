import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Review, Service } from "../../shared/types";
import { SERVICES_DATA } from "../../shared/data";

interface ReviewsSectionProps {
  reviews: Review[];
  services: Service[];
  onAddReview: (review: Omit<Review, "id" | "date" | "helpfulCount" | "verified">) => void;
  onIncrementHelpful: (reviewId: string) => void;
  selectedServiceId?: string;
  onSelectService: (id: string) => void;
}

export default function ReviewsSection({
  reviews,
  services,
  onAddReview,
  onIncrementHelpful,
  selectedServiceId = "house-cleaning",
  onSelectService
}: ReviewsSectionProps) {
  // Form states
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Filter reviews matching the active service selection
  const filteredReviews = reviews.filter((r) => r.serviceId === selectedServiceId);
  const activeServiceName = services.find((s) => s.id === selectedServiceId)?.name || "Service Item";

  const averageRating = filteredReviews.length > 0 
    ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length 
    : 5;

  const handleRatingHover = (val: number) => {
    setRating(val);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert("Please enter a name and a detailed review comment.");
      return;
    }

    onAddReview({
      serviceId: selectedServiceId,
      authorName,
      rating,
      comment
    });

    setAuthorName("");
    setRating(5);
    setComment("");
    setSuccessMsg(true);
    setFormOpen(false);

    setTimeout(() => {
      setSuccessMsg(false);
    }, 4000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Service Selection Row inside reviews section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Verified Customer Feedback</h2>
          <p className="text-xs text-gray-500">
            Read direct feedback about core operations in Springfield, or share your own experience!
          </p>
        </div>
        
        {/* Dropdown utility selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Service filter:</span>
          <select
            value={selectedServiceId}
            onChange={(e) => onSelectService(e.target.value)}
            className="rounded-xl border border-gray-250 p-2.5 text-xs bg-white text-gray-700 font-semibold focus:ring-1 focus:ring-brand focus:border-brand focus:outline-none"
          >
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Rating Overview Gauge (4 cols md) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <span className="text-[10px] text-brand font-extrabold uppercase tracking-widest bg-brand-light px-2 py-0.5 rounded-full">
            Core Rating Gauge
          </span>
          <div>
            <h3 className="text-4xl font-extrabold text-gray-950 tracking-tight">{averageRating.toFixed(1)}</h3>
            <div className="flex justify-center text-amber-400 mt-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Icons.Star
                  key={idx}
                  size={16}
                  fill={idx < Math.floor(averageRating) ? "currentColor" : "none"}
                  className={idx < Math.round(averageRating) ? "text-amber-400" : "text-gray-200"}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">
              Based on {filteredReviews.length} authenticated reviews
            </p>
          </div>

          <div className="border-t border-gray-50 pt-4">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border border-brand text-brand hover:bg-brand hover:text-white transition-all cursor-pointer"
            >
              <Icons.PenLine size={13} />
              <span>Write verified review</span>
            </button>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
              <Icons.CheckCircle size={14} className="text-emerald-600" />
              <span>Review submitted successfully!</span>
            </div>
          )}
        </div>

        {/* Reviews List & Write Form (8 cols md) */}
        <div className="md:col-span-8 space-y-4">
          {/* Form pop down drawer */}
          {formOpen && (
            <form onSubmit={handleReviewSubmit} className="bg-white border border-brand/20 p-5 md:p-6 rounded-2xl shadow-md space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div>
                <h4 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">Write a Review for {activeServiceName}</h4>
                <p className="text-[10px] text-gray-400 font-medium">Your comment is verified instantly on local channels</p>
              </div>

              <div className="space-y-3">
                {/* Score */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Your Rating Score</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const starVal = idx + 1;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRating(starVal)}
                          onMouseEnter={() => handleRatingHover(starVal)}
                          className="text-gray-200 hover:text-amber-400 transition-colors focus:outline-none cursor-pointer"
                        >
                          <Icons.Star
                            size={20}
                            fill={starVal <= rating ? "currentColor" : "none"}
                            className={starVal <= rating ? "text-amber-400" : "text-gray-200"}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="E.g., Jane D."
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Review Comments</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell other Springfield clients what you liked about the technician speed, cleanliness, and helpfulness..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                  />
                </div>
              </div>

              {/* Actions row */}
              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Post Review
                </button>
              </div>
            </form>
          )}

          {/* List items */}
          {filteredReviews.length === 0 ? (
            <div className="bg-white border border-gray-50 rounded-2xl p-8 text-center italic text-xs text-gray-400">
              Be the first to post feedback regarding your custom {activeServiceName} job! Book the service and help keep the dispatch network informed.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-gray-950">{rev.authorName}</span>
                        {rev.verified && (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded-md inline-flex items-center gap-0.5 select-none">
                            <Icons.Check size={10} strokeWidth={3} />
                            <span>Verified Springfield Job</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium font-mono">{rev.date}</span>
                    </div>

                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Icons.Star
                          key={idx}
                          size={11}
                          fill={idx < rev.rating ? "currentColor" : "none"}
                          className={idx < rev.rating ? "text-amber-400" : "text-gray-200"}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-normal font-medium">"{rev.comment}"</p>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <button
                      onClick={() => onIncrementHelpful(rev.id)}
                      className="group/btn text-[10px] text-gray-400 hover:text-brand font-bold inline-flex items-center gap-1.5 select-none focus:outline-none cursor-pointer"
                    >
                      <Icons.ThumbsUp size={11} className="transition-transform group-hover/btn:-translate-y-0.5" />
                      <span>{rev.helpfulCount} clients found this helpful</span>
                    </button>
                    
                    <span className="text-[10px] text-gray-450 italic font-medium">Registered dispatch reviews</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
