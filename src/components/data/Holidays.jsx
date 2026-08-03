import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";
import { Toaster } from "react-hot-toast";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";
import PartnerHolidaysPanel from "../details/PartnerHolidaysPanel";

const Holidays = ({ title = "Holidays" }) => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const partners = useSelector((s) => s.allPartners.allPartnersList) || [];

  const initialStoreId = searchParams.get("storeId") || "";
  const [storeId, setStoreId] = useState(initialStoreId);

  const partnerOptions = useMemo(
    () =>
      (Array.isArray(partners) ? partners : []).map((p) => ({
        value: String(p.id),
        label: `${p.name || p.store_name || "Salon"} (#${p.id})`,
      })),
    [partners]
  );

  const selectedPartner =
    partnerOptions.find((o) => o.value === String(storeId)) || null;

  useEffect(() => {
    dispatch(getAllPartnersList());
  }, [dispatch]);

  const onSelectSalon = (opt) => {
    const id = opt?.value || "";
    setStoreId(id);
    if (id) {
      setSearchParams({ storeId: id });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Salon / Partner
          </label>
          <Select
            className="text-sm"
            classNamePrefix="react-select"
            options={partnerOptions}
            value={selectedPartner}
            onChange={onSelectSalon}
            isClearable
            placeholder="Search and select a salon…"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: 8,
                borderColor: state.isFocused ? "#000" : "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 1px #000" : "none",
                minHeight: 42,
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? "#000"
                  : state.isFocused
                    ? "#f3f4f6"
                    : "white",
                color: state.isSelected ? "white" : "#111827",
              }),
            }}
          />
        </div>

        {!storeId ? (
          <p className="text-sm text-gray-500">
            Select a salon to manage one-day and weekly holidays.
          </p>
        ) : (
          <PartnerHolidaysPanel storeId={storeId} showToaster={false} />
        )}
      </div>
    </div>
  );
};

export default Holidays;
