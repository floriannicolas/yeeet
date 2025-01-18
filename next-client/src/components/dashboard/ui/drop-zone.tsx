import {
    Upload,
} from 'lucide-react';

export default function DropZone({ 
    isVisible,
} : {
    isVisible: boolean,
}) {
    if (!isVisible) {
        return <></>
    }

    return (
        <div className="fixed inset-0 bg-gray-600/50 z-50 p-12">
            <div className="flex items-center justify-center h-full border-2 rounded-lg border-dashed border-white">
                <div className="flex flex-col gap-4 items-center justify-center h-full">
                    <Upload className="w-16 h-16" />
                    <p className="text-white text-2xl">Drop your <span className="font-bold">file</span> here</p>
                </div>
            </div>
        </div>
    )
}