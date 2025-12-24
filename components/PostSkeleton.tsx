import React from 'react';

const PostSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-100 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex flex-col gap-2">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                        <div className="h-3 w-16 bg-slate-200 rounded" />
                    </div>
                </div>
                <div className="h-8 w-8 bg-slate-200 rounded-full" />
            </div>

            {/* Content */}
            <div className="space-y-3 mb-4">
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
            </div>

            {/* Image Placeholder */}
            <div className="w-full aspect-square bg-slate-200 rounded-2xl mb-4" />

            {/* Footer Actions */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-200 rounded-full" />
                    <div className="h-4 w-8 bg-slate-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-200 rounded-full" />
                    <div className="h-4 w-8 bg-slate-200 rounded" />
                </div>
                <div className="flex-1" />
                <div className="h-6 w-6 bg-slate-200 rounded-full" />
            </div>
        </div>
    );
};

export default PostSkeleton;
