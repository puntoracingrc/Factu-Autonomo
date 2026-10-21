import { formatAddressBlock } from "@/lib/customer-address";
import type { Client } from "@/lib/types";

/** Match the full document form: PDF address is a complete captured block,
 * while the deferred customer master keeps its separate editable fields. */
export function quickClientSnapshot(client: Client): Client {
  return { ...client, address: formatAddressBlock(client) || client.address };
}
