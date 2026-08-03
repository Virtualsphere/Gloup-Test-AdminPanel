import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MonthlyReportTable from "../table/MonthlyReportTable";
import { getMonthlyReportDetail } from "../../redux/slices/bookingSlice";

const getMonthBounds = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    const todayStr = now.toISOString().split("T")[0];
    return { firstDay, todayStr };
};

const MonthlyReport = ({ title }) => {
    const dispatch = useDispatch();
    const { firstDay, todayStr } = getMonthBounds();

    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(todayStr);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 50;

    const {
        monthlyReportRows = [],
        monthlyReportTotal = 0,
        monthlyReportLoading,
        monthlyReportError,
    } = useSelector((state) => state.allBookings || {});

    useEffect(() => {
        dispatch(
            getMonthlyReportDetail({
                fromDate,
                toDate,
                page,
                limit,
                status,
            })
        );
    }, [dispatch, fromDate, toDate, page, status]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

            {monthlyReportError ? (
                <div className="text-red-600 bg-red-50 border p-4 rounded">
                    Failed to load monthly report: {monthlyReportError}
                </div>
            ) : monthlyReportLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500">
                    <svg
                        className="animate-spin h-5 w-5 text-purple-500 mr-2"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                        />
                    </svg>
                    Loading Monthly Report...
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <MonthlyReportTable
                        data={monthlyReportRows}
                        page={page}
                        limit={limit}
                        total={monthlyReportTotal}
                        setPage={setPage}
                        status={status}
                        setStatus={setStatus}
                        search={search}
                        setSearch={setSearch}
                        fromDate={fromDate}
                        toDate={toDate}
                        setFromDate={setFromDate}
                        setToDate={setToDate}
                    />
                </div>
            )}
        </div>
    );
};

export default MonthlyReport;
