import React, { useEffect, useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process && process.env && process.env.REACT_APP_API_BASE)
  ? process.env.REACT_APP_API_BASE
  : (typeof window !== 'undefined' && window.__REACT_APP_API_BASE)
    ? window.__REACT_APP_API_BASE
    : 'http://localhost:5000/api';

function useFetch(url, opts) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(url, opts)
      .then(res => {
        if (!res.ok) throw new Error('Network error: ' + res.status);
        return res.json();
      })
      .then(json => { if (mounted) setData(json); })
      .catch(err => { if (mounted) setError(err); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [url]);

  return { data, loading, error };
}

export default function App() {
  const { data: orgs, loading: orgLoading } = useFetch(`${API_BASE}/orgs`);
  const { data: events, loading: eventsLoading } = useFetch(`${API_BASE}/events`);

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [form, setForm] = useState({ title: '', date: '', venue: '', org_id: '', description: '' });
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (events) setLocalEvents(events); }, [events]);
  useEffect(() => { if (orgs && orgs.length) setSelectedOrg(orgs[0]); }, [orgs]);

  function openCreateModal(edit = null) {
    setEditing(edit);
    if (edit) setForm({ title: edit.title || '', date: edit.date || '', venue: edit.venue || '', org_id: edit.org_id || '', description: edit.description || '' });
    else setForm({ title: '', date: '', venue: '', org_id: selectedOrg ? selectedOrg.id : '', description: '' });

    const modalEl = document.getElementById('eventModal');
    if (!modalEl) { alert('Modal element not found'); return; }
    if (!window.bootstrap || !window.bootstrap.Modal) {
      alert('Bootstrap JS not loaded. Make sure bootstrap.bundle.js is included in index.html');
      return;
    }
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }

  async function submitEvent(e) {
    e.preventDefault();
    try {
      const payload = { ...form };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `${API_BASE}/events/${editing.id}` : `${API_BASE}/events`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to save: ' + res.status);
      const saved = await res.json();

      setLocalEvents(prev => {
        if (editing) return prev.map(it => (it.id === saved.id ? saved : it));
        return [saved, ...prev];
      });
      const modalEl = document.getElementById('eventModal');
      const modal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal.getInstance(modalEl) : null;
      if (modal) modal.hide();
      setEditing(null);
    } catch (err) {
      alert('Error: ' + (err.message || err));
      console.error(err);
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Delete failed'); return; }
    setLocalEvents(prev => prev.filter(e => e.id !== id));
  }

  function onChange(e) { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); }

  return (
    <div className="container py-4">
      <header className="d-flex align-items-center mb-4">
        <img src={selectedOrg?.logo || 'https://via.placeholder.com/64'} alt="logo" className="me-3 rounded" style={{ width: 64, height: 64, objectFit: 'cover' }} />
        <div>
          <h2 className="mb-0">{selectedOrg?.name || 'Events Organizer'}</h2>
          <small className="text-muted">{selectedOrg?.tagline || 'Organizing memorable events since forever'}</small>
        </div>
        <div className="ms-auto">
          <button className="btn btn-primary me-2" onClick={() => openCreateModal()}><i className="fa fa-plus me-2"/>Create Event</button>
          <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </header>

      <div className="row">
        <aside className="col-md-4 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Organization</h5>
              {orgLoading ? <p>Loading orgs...</p> : (
                <div>
                  <select className="form-select mb-3" value={selectedOrg?.id || ''} onChange={(e) => setSelectedOrg(orgs.find(o => String(o.id) === e.target.value))}>
                    {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  {selectedOrg && (
                    <div>
                      <p className="mb-1"><strong>Contact:</strong> {selectedOrg.contact}</p>
                      <p className="mb-1"><strong>Email:</strong> {selectedOrg.email}</p>
                      <p className="mb-0 text-muted">{selectedOrg.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">Quick stats</h6>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h4 mb-0">{localEvents.length}</div>
                  <small className="text-muted">Upcoming</small>
                </div>
                <div>
                  <div className="h4 mb-0">{orgs?.length || 0}</div>
                  <small className="text-muted">Orgs</small>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-md-8">
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <h4 className="mb-0">Events</h4>
            <div>
              <input className="form-control" placeholder="Search events..." onChange={(e) => {/* trivial search could be implemented */}} />
            </div>
          </div>

          {eventsLoading ? <p>Loading events...</p> : (
            <div className="list-group">
              {localEvents.map(ev => (
                <div className="list-group-item list-group-item-action d-flex" key={ev.id}>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center">
                      <div>
                        <h5 className="mb-1">{ev.title}</h5>
                        <small className="text-muted">{ev.date ? new Date(ev.date).toLocaleString() : 'Date not set'}</small>
                      </div>
                      <div className="ms-auto text-end">
                        <div>{ev.venue}</div>
                        <small className="text-muted">Hosted by {ev.org_name}</small>
                      </div>
                    </div>
                    <p className="mb-0 mt-2 text-truncate">{ev.description}</p>
                  </div>

                  <div className="ms-3 d-flex flex-column gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openCreateModal(ev)}><i className="fa fa-pen"/></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteEvent(ev.id)}><i className="fa fa-trash"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      <div className="modal fade" id="eventModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={submitEvent}>
            <div className="modal-header">
              <h5 className="modal-title">{editing ? 'Edit Event' : 'Create Event'}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input required name="title" className="form-control" value={form.title} onChange={onChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Date & Time</label>
                <input required name="date" type="datetime-local" className="form-control" value={form.date} onChange={onChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Venue</label>
                <input name="venue" className="form-control" value={form.venue} onChange={onChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Organizer</label>
                <select required name="org_id" className="form-select" value={form.org_id} onChange={onChange}>
                  <option value="">Select</option>
                  {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-control" rows="3" value={form.description || ''} onChange={onChange}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
