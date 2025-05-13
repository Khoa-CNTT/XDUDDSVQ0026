import React from 'react'
export default function DataTableBook() {
    return (
        <tbody>
            <tr className=" text-black hover:bg-[#f1f4f9] border-b-2 border-gray-200">
                <th className="">STT</th>
                <th className="">IDBook</th>
                <th className="">Ten Sach</th>
                <th className="">Tieu De</th>
                <th className="">Tac Gia</th>
                <th className="">Danh Muc</th>
                <th className="">Anh</th>
                <th className="">Gia</th>
                <th className="">IsFree</th>
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
