"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // Adjust based on your folder structure

type Referral = {
  id: string;
  doctor_id: string;
  agency_id: string;
  stage: 'referred' | 'interviewing' | 'compliance_check' | 'placed' | 'rejected';
  doctors: { full_name: string; specialty: string };
  agencies: { agency_name: string };
};

export default function MedHubCRM() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    // This joins the referral with doctor and agency names
    const { data, error } = await supabase
      .from('referral_pipeline')
      .select(`
        id, stage, doctor_id, agency_id,
        doctors (full_name, specialty),
        agencies (agency_name)
      `);
    
    if (data) setReferrals(data as any);
    setLoading(false);
  };

  const updateStage = async (id: string, newStage: string) => {
    const { error } = await supabase
      .from('referral_pipeline')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) fetchReferrals(); // Refresh the list
  };

  return (
    <div style={{ padding: 30, fontFamily: 'sans-serif' }}>
      <h1>MedHub Referral Pipeline</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: 30 }}>
        {['referred', 'interviewing', 'compliance_check', 'placed'].map(stage => (
          <div key={stage} style={{ background: '#f8faff', padding: 15, borderRadius: 12, border: '1px solid #e0eaff' }}>
            <h3 style={{ textTransform: 'capitalize', fontSize: '1rem', color: '#1d4ed8' }}>{stage.replace('_', ' ')}</h3>
            
            {referrals.filter(r => r.stage === stage).map(ref => (
              <div key={ref.id} style={{ background: '#fff', padding: 12, borderRadius: 8, marginTop: 10, border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <p style={{ fontWeight: 'bold', margin: 0 }}>{ref.doctors?.full_name}</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>at {ref.agencies?.agency_name}</p>
                
                <select 
                  onChange={(e) => updateStage(ref.id, e.target.value)}
                  style={{ marginTop: 10, width: '100%', padding: '4px', fontSize: '0.75rem' }}
                  value={ref.stage}
                >
                  <option value="referred">Referred</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="compliance_check">Compliance</option>
                  <option value="placed">Placed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}