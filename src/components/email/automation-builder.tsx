'use client';

import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Zap,
  Mail,
  Clock,
  Tag,
  Users,
  GitBranch,
  Plus,
  Trash2,
  Play,
  Pause,
  Save,
  Settings,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassBadge } from '@/components/ui/glass-badge';

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

// Trigger Node Component
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 min-w-[180px]">
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">{data.description}</p>
    </div>
  );
}

// Action Node Component
function ActionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">{data.description}</p>
    </div>
  );
}

// Condition Node Component
function ConditionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/30 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 !left-[70%]" />
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">{data.description}</p>
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-emerald-400">Ναι</span>
        <span className="text-red-400">Όχι</span>
      </div>
    </div>
  );
}

// Delay Node Component
function DelayNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-white" />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">{data.description}</p>
    </div>
  );
}

// Available node templates
const nodeTemplates = {
  triggers: [
    { type: 'trigger', label: 'Νέος Πελάτης', description: 'Όταν προστεθεί νέος πελάτης', icon: Users },
    { type: 'trigger', label: 'Γενέθλια', description: 'Όταν είναι τα γενέθλια πελάτη', icon: Zap },
    { type: 'trigger', label: 'Ετικέτα Προστέθηκε', description: 'Όταν προστεθεί συγκεκριμένη ετικέτα', icon: Tag },
    { type: 'trigger', label: 'Αδράνεια', description: 'Όταν πελάτης είναι αδρανής X μέρες', icon: Clock },
  ],
  actions: [
    { type: 'action', label: 'Αποστολή Email', description: 'Στείλε email στον πελάτη', icon: Mail },
    { type: 'action', label: 'Προσθήκη Ετικέτας', description: 'Πρόσθεσε ετικέτα στον πελάτη', icon: Tag },
    { type: 'action', label: 'Ενημέρωση Πελάτη', description: 'Ενημέρωσε στοιχεία πελάτη', icon: Users },
  ],
  conditions: [
    { type: 'condition', label: 'Έλεγχος Ετικέτας', description: 'Έχει συγκεκριμένη ετικέτα;', icon: Tag },
    { type: 'condition', label: 'Έλεγχος Πόλης', description: 'Είναι από συγκεκριμένη πόλη;', icon: Users },
    { type: 'condition', label: 'Έλεγχος Κατηγορίας', description: 'Ανήκει σε κατηγορία;', icon: GitBranch },
  ],
  delays: [
    { type: 'delay', label: 'Αναμονή', description: 'Περίμενε X χρόνο', icon: Clock },
  ],
};

interface AutomationBuilderProps {
  automationId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[], name: string) => void;
}

export function AutomationBuilder({
  automationId,
  initialNodes = [],
  initialEdges = [],
  onSave,
}: AutomationBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [automationName, setAutomationName] = useState('Νέος Αυτοματισμός');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addNode = (template: typeof nodeTemplates.triggers[0]) => {
    const newNode: Node = {
      id: `${template.type}-${Date.now()}`,
      type: template.type,
      position: { x: 250, y: nodes.length * 120 + 50 },
      data: {
        label: template.label,
        description: template.description,
        config: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeConfigOpen(true);
  };

  const handleSave = () => {
    onSave?.(nodes, edges, automationName);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - Node Palette */}
      {sidebarOpen && (
        <div className="w-72 border-r border-white/[0.08] bg-zinc-900/50 p-4 overflow-y-auto">
          <div className="mb-4">
            <GlassInput
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              placeholder="Όνομα αυτοματισμού"
            />
          </div>

          {/* Triggers */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Triggers
            </h4>
            <div className="space-y-2">
              {nodeTemplates.triggers.map((template, index) => {
                const Icon = template.icon;
                return (
                  <button
                    key={index}
                    onClick={() => addNode(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-sm text-white">{template.label}</p>
                      <p className="text-xs text-white/50">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Mail className="h-3 w-3" />
              Actions
            </h4>
            <div className="space-y-2">
              {nodeTemplates.actions.map((template, index) => {
                const Icon = template.icon;
                return (
                  <button
                    key={index}
                    onClick={() => addNode(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <div>
                      <p className="text-sm text-white">{template.label}</p>
                      <p className="text-xs text-white/50">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GitBranch className="h-3 w-3" />
              Conditions
            </h4>
            <div className="space-y-2">
              {nodeTemplates.conditions.map((template, index) => {
                const Icon = template.icon;
                return (
                  <button
                    key={index}
                    onClick={() => addNode(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-violet-400" />
                    <div>
                      <p className="text-sm text-white">{template.label}</p>
                      <p className="text-xs text-white/50">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delays */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Delays
            </h4>
            <div className="space-y-2">
              {nodeTemplates.delays.map((template, index) => {
                const Icon = template.icon;
                return (
                  <button
                    key={index}
                    onClick={() => addNode(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-white/70" />
                    <div>
                      <p className="text-sm text-white">{template.label}</p>
                      <p className="text-xs text-white/50">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background color="#333" gap={20} />
          <Controls className="!bg-zinc-900 !border-white/10" />
          <MiniMap
            className="!bg-zinc-900 !border-white/10"
            nodeColor={(node) => {
              switch (node.type) {
                case 'trigger':
                  return '#f59e0b';
                case 'action':
                  return '#06b6d4';
                case 'condition':
                  return '#8b5cf6';
                default:
                  return '#666';
              }
            }}
          />
        </ReactFlow>

        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <GlassButton
            variant="default"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? 'Κλείσιμο Palette' : 'Άνοιγμα Palette'}
          </GlassButton>
          <GlassButton variant="default" size="sm" leftIcon={<Play className="h-4 w-4" />}>
            Δοκιμή
          </GlassButton>
          <GlassButton variant="primary" size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
            Αποθήκευση
          </GlassButton>
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Zap className="h-16 w-16 text-amber-400/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/70">Δημιουργήστε τον αυτοματισμό σας</h3>
              <p className="text-sm text-white/40 mt-2">
                Σύρετε elements από το sidebar για να ξεκινήσετε
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Node Configuration Modal */}
      <GlassModal
        isOpen={nodeConfigOpen}
        onClose={() => setNodeConfigOpen(false)}
        title={`Ρύθμιση: ${selectedNode?.data?.label}`}
        size="md"
      >
        <div className="p-6">
          {selectedNode?.type === 'action' && (
            <div className="space-y-4">
              <GlassInput
                label="Email Template"
                placeholder="Επιλέξτε template..."
              />
              <GlassInput
                label="Θέμα Email"
                placeholder="Θέμα email..."
              />
            </div>
          )}

          {selectedNode?.type === 'delay' && (
            <div className="space-y-4">
              <GlassInput
                label="Χρόνος Αναμονής"
                type="number"
                placeholder="1"
              />
              <select className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white">
                <option value="hours">Ώρες</option>
                <option value="days">Ημέρες</option>
                <option value="weeks">Εβδομάδες</option>
              </select>
            </div>
          )}

          {selectedNode?.type === 'condition' && (
            <div className="space-y-4">
              <select className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white">
                <option value="">Επιλέξτε πεδίο...</option>
                <option value="city">Πόλη</option>
                <option value="category">Κατηγορία</option>
                <option value="tag">Ετικέτα</option>
              </select>
              <GlassInput
                label="Τιμή"
                placeholder="π.χ. Αθήνα"
              />
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-white/[0.08]">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedNode) deleteNode(selectedNode.id);
                setNodeConfigOpen(false);
              }}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Διαγραφή
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setNodeConfigOpen(false)}
            >
              Αποθήκευση
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

