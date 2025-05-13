import React from 'react'
export default function DataTableCategory({item}) {
    return (
        <tbody>
            <tr className=" text-black hover:bg-[#f1f4f9] border-b-2 border-gray-200">
                <th className="">stt</th>
                <th className="">id danh muc</th>
                <th className="">ten danh muc</th>
        
                <th className="item-center">
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Sửa
                    </button>
                    <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-2">
                        Xoá
                    </button>
                </th>
            </tr>
        </tbody>
    )
    
}
