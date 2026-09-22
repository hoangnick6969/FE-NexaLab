import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, uploadFile } from "./api";
import { Badge, ErrorBox, Field, Modal, useAction } from "./ui";
import { PageHeading } from "./App";
export default function Admin() {
  const [tab, setTab] = useState("users");
  const [edit, setEdit] = useState<any>(null);
  const q = useQuery({
    queryKey: ["admin", tab],
    queryFn: () => api(tab === "labs" ? "/admin/labs" : "/" + tab),
  });
  const save = useAction((data: any) =>
    api(
      "/" + tab + (data.id ? "/" + data.id : ""),
      data.id ? "PUT" : "POST",
      data,
    ),
  );
  const remove = useAction((id: string) => api("/" + tab + "/" + id, "DELETE"));
  const upload = useAction(async (file: File) => {
    const asset = await uploadFile(file);
    setEdit((s: any) => ({
      ...s,
      assets: [
        ...(s.assets ?? []),
        {
          name: asset.title,
          url: asset.url,
          license: "Chưa khai báo — cần cập nhật giấy phép",
        },
      ],
    }));
  });
  const title = {
    users: "Người dùng",
    subjects: "Môn học",
    labs: "Phòng lab & asset",
  }[tab];
  return (
    <>
      <PageHeading
        eyebrow="QUẢN TRỊ"
        title="Quản trị hệ thống"
        action={
          tab !== "labs" ? (
            <button
              className="primary"
              onClick={() =>
                setEdit(
                  tab === "users"
                    ? {
                        email: "",
                        fullName: "",
                        password: "",
                        role: "STUDENT",
                        grade: 8,
                        consent: true,
                      }
                    : { name: "", newId: "" },
                )
              }
            >
              + Thêm {tab === "users" ? "người dùng" : "môn học"}
            </button>
          ) : null
        }
      />
      <div className="tabs admin-tabs">
        {[
          ["users", "Người dùng"],
          ["subjects", "Môn học"],
          ["labs", "Phòng lab & asset"],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setEdit(null);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <ErrorBox error={q.error || remove.error} />
      <section className="panel table-wrap">
        <h2>{title}</h2>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Thông tin</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((row: any) => (
              <tr key={row.id}>
                <td>{row.fullName ?? row.name ?? row.title}</td>
                <td>
                  {tab === "users" ? (
                    <>
                      {row.email} <Badge>{row.role}</Badge>
                    </>
                  ) : tab === "labs" ? (
                    <Badge>{row.status}</Badge>
                  ) : (
                    row.id
                  )}
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => setEdit({ ...row })}
                  >
                    Chỉnh sửa
                  </button>
                  {tab !== "labs" && (
                    <button
                      className="danger-text"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Xóa " +
                              (row.fullName ?? row.name) +
                              "? Chỉ có thể xóa khi không vướng dữ liệu liên quan.",
                          )
                        )
                          remove.mutate(row.id);
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {edit && (
        <Modal
          title={edit.id ? "Chỉnh sửa" : "Tạo mới"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data =
                tab === "subjects" && !edit.id
                  ? { id: edit.newId, name: edit.name }
                  : edit;
              if (tab === "subjects" && !edit.id) {
                api("/subjects", "POST", data)
                  .then(() => {
                    setEdit(null);
                    q.refetch();
                  })
                  .catch((e) => alert(e.message));
                return;
              }
              save.mutate(data, { onSuccess: () => setEdit(null) });
            }}
          >
            {tab === "users" ? (
              <>
                <Field
                  label="Họ tên"
                  value={edit.fullName}
                  required
                  onChange={(e) =>
                    setEdit({ ...edit, fullName: e.target.value })
                  }
                />
                {!edit.id && (
                  <>
                    <Field
                      label="Email"
                      type="email"
                      value={edit.email}
                      required
                      onChange={(e) =>
                        setEdit({ ...edit, email: e.target.value })
                      }
                    />
                    <Field
                      label="Mật khẩu"
                      type="password"
                      minLength={12}
                      value={edit.password}
                      required
                      onChange={(e) =>
                        setEdit({ ...edit, password: e.target.value })
                      }
                    />
                    <label className="field">
                      <span>Vai trò</span>
                      <select
                        value={edit.role}
                        onChange={(e) =>
                          setEdit({ ...edit, role: e.target.value })
                        }
                      >
                        {["STUDENT", "TEACHER", "PARENT", "ADMIN"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <label className="check">
                      <input type="checkbox" required />
                      Đã xác minh chấp thuận xử lý dữ liệu.
                    </label>
                  </>
                )}
                <Field
                  label="Khối lớp"
                  type="number"
                  min={6}
                  max={9}
                  value={edit.grade}
                  onChange={(e) =>
                    setEdit({ ...edit, grade: Number(e.target.value) })
                  }
                />
              </>
            ) : tab === "subjects" ? (
              <>
                {!edit.id && (
                  <Field
                    label="Mã môn học (không dấu)"
                    required
                    pattern="[a-z0-9-]+"
                    value={edit.newId}
                    onChange={(e) =>
                      setEdit({ ...edit, newId: e.target.value })
                    }
                  />
                )}
                <Field
                  label="Tên môn"
                  required
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </>
            ) : (
              <>
                {[
                  ["title", "Tên lab"],
                  ["topic", "Chủ đề"],
                  ["learningObjective", "Mục tiêu học tập"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    required
                    value={edit[key]}
                    onChange={(e) =>
                      setEdit({ ...edit, [key]: e.target.value })
                    }
                  />
                ))}
                <label className="field">
                  <span>Trạng thái</span>
                  <select
                    value={edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value })
                    }
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Xuất bản</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </label>
                <p className="notice">
                  Công thức mô phỏng được version hóa trong package sim. Chỉnh
                  công thức cần thay code, chạy test và được duyệt chuyên môn;
                  không cho nhập mã thực thi từ trang quản trị.
                </p>
                <h3>Tài nguyên 3D</h3>
                <label className="field">
                  <span>Tải GLB (tối đa 20 MB)</span>
                  <input
                    type="file"
                    accept=".glb"
                    disabled={upload.isPending}
                    onChange={(e) => {
                      if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
                    }}
                  />
                </label>
                {(edit.assets ?? []).map((a: any, i: number) => (
                  <div className="panel" key={i}>
                    <b>{a.name}</b>
                    <Field
                      label="Giấy phép / nguồn"
                      required
                      value={a.license}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          assets: edit.assets.map((x: any, j: number) =>
                            j === i ? { ...x, license: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          assets: edit.assets.filter(
                            (_: any, j: number) => j !== i,
                          ),
                        })
                      }
                    >
                      Bỏ liên kết asset
                    </button>
                  </div>
                ))}
                <ErrorBox error={upload.error} />
              </>
            )}
            <ErrorBox error={save.error} />
            <button className="primary wide" disabled={save.isPending}>
              Lưu thay đổi
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
