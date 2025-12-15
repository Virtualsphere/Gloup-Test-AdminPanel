import {
  CalendarDays,
  Globe,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  User,
} from "lucide-react";
import schoolIllu from "../../assets/images/schoolillustration.jpg";
import { useSelector } from "react-redux";

export default function SchoolDetail({ schoolDetail = {} }) {
  const schoolData = {
    adminId: 1,
    createdAt: "2025-05-19T11:00:41.000Z",
    id: 1,
    schoolContact: "9898989898",
    schoolEmail: "nandhacentral@gmail.com",
    schoolImage: "/images/IMG-1747652441256.jpg",
    schoolName: "Nandha Central",
    schoolWebsite: "https://nandha.edu",
    status: "active",
    updatedAt: "2025-05-19T11:00:41.000Z",
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  let profile = useSelector((state) => state.profile.profileList);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Card Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-6 pb-0">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* School Image */}
            <div className="flex-shrink-0">
              <div className="w-full lg:w-48 h-48 lg:h-32 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={schoolIllu}
                  alt="school"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* School Info Header */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {schoolDetail.schoolName}
                  </h1>
                  <div className="pt-2">
                    {/* Custom Button */}
                    <a
                      href={schoolDetail.schoolWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </div>
                </div>
                {/* Status Badge */}
                <span
                  style={{ textTransform: "capitalize" }}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium w-fit ${
                    schoolDetail.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {schoolDetail.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                School Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a
                      href={`tel:${schoolDetail.schoolContact}`}
                      className="text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {schoolDetail.schoolContact}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a
                      href={`mailto:${schoolDetail.schoolEmail}`}
                      className="text-gray-900 hover:text-blue-600 transition-colors break-all"
                    >
                      {schoolDetail.schoolEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a
                      href={schoolDetail.schoolWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-blue-600 transition-colors break-all"
                    >
                      {schoolDetail.schoolWebsite}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Administrative Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Administrative Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Admin</p>
                    <p className="text-gray-900 text-sm capitalize">{profile?.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900 text-sm">{profile?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900 text-sm">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
